//
//  LumenSaverView.m
//  流光壁纸 · macOS 屏幕保护程序宿主
//
//  把 wallpapers/<id>/wallpaper.html 嵌进 WKWebView，交给 ScreenSaver.framework。
//  每个 .saver 只带一个壁纸 HTML，避免在沙盒里读取外部目录。
//

#import <Cocoa/Cocoa.h>
#import <ScreenSaver/ScreenSaver.h>
#import <WebKit/WebKit.h>

@interface LumenSaverView : ScreenSaverView <WKNavigationDelegate>
@end

@interface LumenSaverView ()
- (void)loadWallpaper;
- (void)showError:(NSString *)message;
- (NSString *)javaScriptStringLiteral:(NSString *)string;
@end

@implementation LumenSaverView {
    WKWebView *_webView;
    BOOL _didStart;
}

#pragma mark - ScreenSaverView

+ (BOOL)performGammaFade
{
    return YES;
}

- (instancetype)initWithFrame:(NSRect)frame isPreview:(BOOL)isPreview
{
    self = [super initWithFrame:frame isPreview:isPreview];
    if (self == nil) {
        return nil;
    }

    self.wantsLayer = YES;
    self.layer.backgroundColor = NSColor.blackColor.CGColor;

    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    // 屏保没有持久化需求，避免在 legacyScreenSaver 容器里留下缓存。
    configuration.websiteDataStore = [WKWebsiteDataStore nonPersistentDataStore];
    configuration.suppressesIncrementalRendering = NO;

    // 屏保里不需要交互提示；顺便藏掉壁纸自带的 HUD/操作说明。
    NSString *chromeCSS =
        @"html.lumen-saver .hud,"
         "html.lumen-saver .enter,"
         "html.lumen-saver .reticle,"
         "html.lumen-saver #ui,"
         "html.lumen-saver .ui,"
         "html.lumen-saver .top-left,"
         "html.lumen-saver .top-right,"
         "html.lumen-saver .bottom-left,"
         "html.lumen-saver .bottom-right,"
         "html.lumen-saver .note,"
         "html.lumen-saver .level,"
         "html.lumen-saver .edge-label,"
         "html.lumen-saver .corner,"
         "html.lumen-saver .controls,"
         "html.lumen-saver .brand,"
         "html.lumen-saver .hint,"
         "html.lumen-saver #hint,"
         "html.lumen-saver #toolbar { display: none !important; }"
         "html.lumen-saver, html.lumen-saver body { cursor: none !important; }";

    NSString *scriptSource = [NSString stringWithFormat:
        @"(function () {"
         "  var apply = function () {"
         "    if (!document.documentElement) { return; }"
         "    document.documentElement.classList.add('lumen-saver');"
         "    var style = document.createElement('style');"
         "    style.id = 'lumen-saver-style';"
         "    style.textContent = %@;"
         "    (document.head || document.documentElement).appendChild(style);"
         "  };"
         "  if (document.readyState === 'loading') {"
         "    document.addEventListener('DOMContentLoaded', apply, { once: true });"
         "  } else {"
         "    apply();"
         "  }"
         "})();",
        [self javaScriptStringLiteral:chromeCSS]];

    WKUserScript *userScript = [[WKUserScript alloc]
        initWithSource:scriptSource
         injectionTime:WKUserScriptInjectionTimeAtDocumentEnd
      forMainFrameOnly:YES];
    [configuration.userContentController addUserScript:userScript];

    _webView = [[WKWebView alloc] initWithFrame:self.bounds configuration:configuration];
    _webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    _webView.navigationDelegate = self;
    _webView.allowsBackForwardNavigationGestures = NO;
    _webView.allowsMagnification = NO;
    if ([_webView respondsToSelector:@selector(setAllowsLinkPreview:)]) {
        _webView.allowsLinkPreview = NO;
    }
    _webView.layer.backgroundColor = NSColor.blackColor.CGColor;

    // 私有 KVC：避免 WKWebView 在首帧前画白底。属性不存在时忽略即可。
    @try {
        [_webView setValue:@NO forKey:@"drawsBackground"];
    } @catch (__unused NSException *exception) {
    }

    [self addSubview:_webView];
    return self;
}

- (void)startAnimation
{
    [super startAnimation];

    _webView.hidden = NO;
    if (!_didStart) {
        _didStart = YES;
        [self loadWallpaper];
    }
}

- (void)stopAnimation
{
    [super stopAnimation];
    // WebKit 会因视图隐藏而把页面标记为 hidden，壁纸里的 visibilitychange
    // 处理会暂停 requestAnimationFrame。
    _webView.hidden = YES;
}

- (BOOL)hasConfigureSheet
{
    return NO;
}

- (NSWindow *)configureSheet
{
    return nil;
}

#pragma mark - Loading

- (void)loadWallpaper
{
    NSBundle *bundle = [NSBundle bundleForClass:[self class]];
    NSURL *htmlURL = [bundle URLForResource:@"wallpaper" withExtension:@"html"];
    if (htmlURL == nil) {
        [self showError:@"找不到 wallpaper.html"];
        return;
    }

    NSURL *resourceDirectory = [NSURL fileURLWithPath:[bundle resourcePath] isDirectory:YES];
    [_webView loadFileURL:htmlURL allowingReadAccessToURL:resourceDirectory];
}

#pragma mark - WKNavigationDelegate

- (void)webView:(WKWebView *)webView
    didFailProvisionalNavigation:(WKNavigation *)navigation
                       withError:(NSError *)error
{
    [self showError:[NSString stringWithFormat:@"壁纸加载失败：%@", error.localizedDescription]];
}

- (void)webView:(WKWebView *)webView
    didFailNavigation:(WKNavigation *)navigation
            withError:(NSError *)error
{
    [self showError:[NSString stringWithFormat:@"壁纸加载失败：%@", error.localizedDescription]];
}

#pragma mark - Helpers

- (void)showError:(NSString *)message
{
    NSLog(@"[LumenSaver] %@", message);

    NSTextField *label = [NSTextField labelWithString:message];
    label.textColor = NSColor.secondaryLabelColor;
    label.font = [NSFont systemFontOfSize:15];
    label.alignment = NSTextAlignmentCenter;
    label.frame = NSInsetRect(self.bounds, 40, 40);
    label.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    [self addSubview:label];
}

// 把任意字符串安全地写进 JS 字符串字面量。
- (NSString *)javaScriptStringLiteral:(NSString *)string
{
    NSData *data = [NSJSONSerialization dataWithJSONObject:@[string] options:0 error:nil];
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    // json 形如 ["..."]，去掉外层方括号即得到一个合法的 JS 字符串字面量。
    return [json substringWithRange:NSMakeRange(1, json.length - 2)];
}

@end
