using System;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;
using System.Windows.Automation;

// Exercise only controls created by this fixture. Never inspect the user's focus.
internal sealed class ReaderProbe : Form
{
    protected override bool ShowWithoutActivation { get { return true; } }
    [STAThread]
    private static void Main()
    {
        var form = new ReaderProbe { ShowInTaskbar = false, StartPosition = FormStartPosition.Manual,
            Location = new Point(-30000, -30000), Size = new Size(300, 150), Text = "Lumen input fixture" };
        var input = new TextBox { Text = "星光", Width = 200 };
        var password = new TextBox { Text = "never capture", UseSystemPasswordChar = true, Top = 40 };
        var readOnly = new TextBox { Text = "old document", ReadOnly = true, Top = 80 };
        form.Controls.AddRange(new Control[] { input, password, readOnly });
        form.Shown += delegate {
            IntPtr a = input.Handle, b = password.Handle, c = readOnly.Handle;
            var worker = new Thread(delegate() {
                try {
                    string text;
                    if (!InputReader.TryRead(AutomationElement.FromHandle(a), out text) || text != "星光") throw new Exception("Editable text not read");
                    if (InputReader.TryRead(AutomationElement.FromHandle(b), out text)) throw new Exception("Password was exposed");
                    if (InputReader.TryRead(AutomationElement.FromHandle(c), out text)) throw new Exception("Read-only control was exposed");
                    form.Invoke((Action)delegate { input.Text = "星光银河"; });
                    if (!InputReader.TryRead(AutomationElement.FromHandle(a), out text) || text != "星光银河") throw new Exception("Updated text not read");
                    Console.WriteLine("PASS native UI Automation editable Unicode text, changes, password and read-only exclusions");
                } catch (Exception e) { Console.Error.WriteLine(e.Message); Environment.ExitCode = 1; }
                finally { form.BeginInvoke((Action)delegate { form.Close(); }); }
            });
            worker.SetApartmentState(ApartmentState.MTA); worker.Start();
        };
        Application.Run(form);
    }
}
