//
//  SaverHarness.m
//  在普通 App 进程里加载 .saver，实例化 ScreenSaverView，跑几秒后
//  用 WKWebView 的 takeSnapshot 截图，并输出页面探针信息。
//
//  用法：SaverHarness <xxx.saver> <out.png> [毫秒]
//

#import <Cocoa/Cocoa.h>
#import <ScreenSaver/ScreenSaver.h>
#import <WebKit/WebKit.h>
#import <objc/message.h>

static WKWebView *FindWebView(NSView *view)
{
    if ([view isKindOfClass:[WKWebView class]]) {
        return (WKWebView *)view;
    }
    for (NSView *child in view.subviews) {
        WKWebView *found = FindWebView(child);
        if (found) return found;
    }
    return nil;
}

static void PumpRunLoop(NSTimeInterval seconds)
{
    NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:seconds];
    while (deadline.timeIntervalSinceNow > 0) {
        @autoreleasepool {
            [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode
                                     beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.02]];
        }
    }
}

static NSImage *TakeSnapshot(WKWebView *webView)
{
    __block NSImage *image = nil;
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

    WKSnapshotConfiguration *config = [[WKSnapshotConfiguration alloc] init];
    config.rect = webView.bounds;
    config.snapshotWidth = @(webView.bounds.size.width);

    [webView takeSnapshotWithConfiguration:config
                         completionHandler:^(NSImage *snapshot, NSError *error) {
        if (error) {
            fprintf(stderr, "snapshot error: %s\n", error.localizedDescription.UTF8String);
        }
        image = snapshot;
        dispatch_semaphore_signal(semaphore);
    }];

    while (dispatch_semaphore_wait(semaphore, DISPATCH_TIME_NOW) != 0) {
        PumpRunLoop(0.02);
    }
    return image;
}

static NSString *Evaluate(WKWebView *webView, NSString *script)
{
    __block NSString *result = nil;
    __block BOOL done = NO;

    [webView evaluateJavaScript:script
              completionHandler:^(id value, NSError *error) {
        if (error) {
            result = [NSString stringWithFormat:@"<error: %@>", error.localizedDescription];
        } else if (value == nil) {
            result = @"<nil>";
        } else {
            result = [value description];
        }
        done = YES;
    }];

    NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:5.0];
    while (!done && deadline.timeIntervalSinceNow > 0) {
        PumpRunLoop(0.02);
    }
    return result ?: @"<timeout>";
}

int main(int argc, const char *argv[])
{
    @autoreleasepool {
        if (argc < 3) {
            fprintf(stderr, "usage: SaverHarness <bundle.saver> <out.png> [durationMs]\n");
            return 2;
        }

        NSString *bundlePath = [NSString stringWithUTF8String:argv[1]];
        NSString *outputPath = [NSString stringWithUTF8String:argv[2]];
        NSTimeInterval duration = argc > 3 ? atof(argv[3]) / 1000.0 : 4.0;

        [NSApplication sharedApplication];
        [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
        [NSApp finishLaunching];

        NSBundle *bundle = [NSBundle bundleWithPath:bundlePath];
        if (bundle == nil) {
            fprintf(stderr, "cannot open bundle: %s\n", bundlePath.UTF8String);
            return 1;
        }
        NSError *loadError = nil;
        if (![bundle loadAndReturnError:&loadError]) {
            fprintf(stderr, "cannot load bundle: %s\n", loadError.localizedDescription.UTF8String);
            return 1;
        }

        Class principalClass = bundle.principalClass;
        if (principalClass == Nil || ![principalClass isSubclassOfClass:[ScreenSaverView class]]) {
            fprintf(stderr, "invalid principal class: %s\n", NSStringFromClass(principalClass).UTF8String);
            return 1;
        }

        NSRect frame = NSMakeRect(0, 0, 1440, 900);
        ScreenSaverView *saverView = [[principalClass alloc] initWithFrame:frame isPreview:NO];
        if (saverView == nil) {
            fprintf(stderr, "cannot instantiate saver view\n");
            return 1;
        }

        NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(80, 80, frame.size.width, frame.size.height)
                                                      styleMask:NSWindowStyleMaskBorderless
                                                        backing:NSBackingStoreBuffered
                                                          defer:NO];
        window.backgroundColor = [NSColor blackColor];
        window.contentView = saverView;
        window.level = NSFloatingWindowLevel;
        [window makeKeyAndOrderFront:nil];
        [NSApp activateIgnoringOtherApps:YES];
        PumpRunLoop(0.5);

        printf("WINDOW visible=%d occluded=%d frame=%s\n",
               window.isVisible,
               (window.occlusionState & NSWindowOcclusionStateVisible) != 0,
               NSStringFromRect(window.frame).UTF8String);

        WKWebView *earlyWebView = FindWebView(saverView);
        SEL occlusionSel = NSSelectorFromString(@"_setWindowOcclusionDetectionEnabled:");
        if (earlyWebView && [earlyWebView respondsToSelector:occlusionSel]) {
            ((void (*)(id, SEL, BOOL))objc_msgSend)(earlyWebView, occlusionSel, NO);
            printf("occlusion detection disabled\n");
        }

        [saverView startAnimation];
        PumpRunLoop(duration);

        WKWebView *webView = FindWebView(saverView);
        if (webView == nil) {
            fprintf(stderr, "no WKWebView found in saver view\n");
            return 1;
        }

        Evaluate(webView,
            @"window.__lumenRafCount = 0;"
             " (function loop() { window.__lumenRafCount++; requestAnimationFrame(loop); })();");
        PumpRunLoop(0.6);

        NSString *probe = @"JSON.stringify({"
            "title: document.title,"
            "visibility: document.visibilityState,"
            "focused: document.hasFocus(),"
            "rafFrames: window.__lumenRafCount,"
            "viewport: [innerWidth, innerHeight],"
            "canvases: Array.from(document.querySelectorAll('canvas')).map(function (c) {"
            "  return { size: [c.width, c.height], css: [Math.round(c.clientWidth), Math.round(c.clientHeight)] };"
            "}),"
            "webgl2: (function () {"
            "  try {"
            "    var c = document.querySelector('canvas');"
            "    if (!c) return 'no-canvas';"
            "    var gl = c.getContext('webgl2');"
            "    if (!gl) return 'no-context';"
            "    var dbg = gl.getExtension('WEBGL_debug_renderer_info');"
            "    return {"
            "      version: gl.getParameter(gl.VERSION),"
            "      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),"
            "      drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight]"
            "    };"
            "  } catch (e) { return 'error: ' + e.message; }"
            "})(),"
            "htmlClass: document.documentElement.className,"
            "bodyClass: document.body ? document.body.className : '',"
            "chrome: (function () {"
            "  var el = document.querySelector('.hud, .ui, #ui');"
            "  return el ? getComputedStyle(el).display : 'none-found';"
            "})()"
            "});";

        NSString *result = Evaluate(webView, probe);
        printf("PROBE %s\n", result.UTF8String);
        printf("VIEW %s\n", NSStringFromRect(saverView.bounds).UTF8String);

        NSImage *snapshot = TakeSnapshot(webView);
        if (snapshot == nil) {
            fprintf(stderr, "snapshot failed\n");
            return 1;
        }

        NSBitmapImageRep *rep = [NSBitmapImageRep imageRepWithData:[snapshot TIFFRepresentation]];
        NSData *png = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        if (png == nil) {
            fprintf(stderr, "png encode failed\n");
            return 1;
        }
        [png writeToFile:outputPath atomically:YES];
        printf("SNAPSHOT %s (%lux%lu)\n", outputPath.UTF8String,
               (unsigned long)rep.pixelsWide, (unsigned long)rep.pixelsHigh);

        [saverView stopAnimation];
        return 0;
    }
}
