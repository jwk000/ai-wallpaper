using System;
using System.Text;
using System.Threading;
using System.Windows.Automation;
using System.Web.Script.Serialization;
using System.Diagnostics;

// Read-only UI Automation adapter. No key hooks, clipboard reads, or disk text logs.
internal static class InputReader
{
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    internal static bool TryRead(AutomationElement element, out string text)
    {
        text = null;
        if (element == null || element.Current.IsPassword || !element.Current.IsEnabled) return false;
        var type = element.Current.ControlType;
        if (type != ControlType.Edit && type != ControlType.Document) return false;
        object pattern;
        if (element.TryGetCurrentPattern(ValuePattern.Pattern, out pattern))
        {
            var value = (ValuePattern)pattern;
            if (value.Current.IsReadOnly) return false;
            text = value.Current.Value;
        }
        else if (element.TryGetCurrentPattern(TextPattern.Pattern, out pattern))
        {
            var range = ((TextPattern)pattern).DocumentRange;
            object readOnly = range.GetAttributeValue(TextPattern.IsReadOnlyAttribute);
            if (!(readOnly is bool) || (bool)readOnly) return false;
            text = range.GetText(32769);
        }
        return text != null && text.Length <= 32768;
    }

    [MTAThread]
    public static void Main(string[] args)
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        int parentId;
        if (args.Length != 1 || !Int32.TryParse(args[0], out parentId)) return;
        Process parent;
        try { parent = Process.GetProcessById(parentId); } catch { return; }
        while (true)
        {
            if (parent.HasExited) return;
            try
            {
                var element = AutomationElement.FocusedElement;
                string text;
                if (TryRead(element, out text))
                {
                    string id = element.Current.ProcessId + ":" + String.Join(".", element.GetRuntimeId());
                    Console.WriteLine(Json.Serialize(new { id = id, text = text, supported = true }));
                }
                else Console.WriteLine("{\"supported\":false}");
            }
            catch (Exception)
            {
                // Focus can change or an application may deny access during a read.
                Console.WriteLine("{\"supported\":false}");
            }
            Thread.Sleep(220);
        }
    }
}
