using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;

namespace OAREditorApp
{
    public partial class MainForm : Form
    {
        private WebView2 webView;
        private int port = 8080;
        private string baseDir = AppDomain.CurrentDomain.BaseDirectory;

        public MainForm()
        {
            InitializeComponent();
            this.Text = "OAR External Tool";
            this.Size = new System.Drawing.Size(1280, 800);
            this.StartPosition = FormStartPosition.CenterScreen;

            if (File.Exists("app_icon.ico"))
            {
                this.Icon = new System.Drawing.Icon("app_icon.ico");
            }

            InitializeWebView();
            StartInternalServer();
        }

        private async void InitializeWebView()
        {
            webView = new WebView2
            {
                Dock = DockStyle.Fill
            };
            this.Controls.Add(webView);

            try {
                await webView.EnsureCoreWebView2Async(null);
                
                // Add permission handler to suppress browser prompts for file system access
                webView.CoreWebView2.PermissionRequested += (sender, e) =>
                {
                    if (e.PermissionKind == CoreWebView2PermissionKind.FileReadWrite)
                    {
                        e.State = CoreWebView2PermissionState.Allow;
                        e.Handled = true;
                    }
                };

                // IPC Message Handler for logging
                webView.CoreWebView2.WebMessageReceived += (sender, args) =>
                {
                    try {
                        var msg = args.TryGetWebMessageAsString();
                        if (msg.StartsWith("ERROR:")) {
                            File.AppendAllText("error.log", $"[{DateTime.Now}] JS Exception: {msg}\n");
                        }
                    } catch { /* Suppress ipc errors to avoid crashing */ }
                };

                // Inject global JS error hooks
                await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"
                    window.addEventListener('error', function(e) {
                        try { window.chrome.webview.postMessage('ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno); } catch(err){}
                    });
                    window.addEventListener('unhandledrejection', function(e) {
                        try { window.chrome.webview.postMessage('ERROR: Unhandled Promise Rejection - ' + e.reason); } catch(err){}
                    });
                ");

                webView.Source = new Uri($"http://localhost:{port}/index.html");
                
                // Optional: Disable context menu or other browser features
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                webView.CoreWebView2.Settings.IsZoomControlEnabled = true;
            } catch (WebView2RuntimeNotFoundException) {
                var result = MessageBox.Show(
                    "이 OAR 에디터 프로그램을 실행하려면 'Microsoft Edge WebView2 런타임'이 시스템에 설치되어 있어야 합니다.\n\n" +
                    "지금 Microsoft 공식 다운로드 웹페이지로 이동하여 설치하시겠습니까?", 
                    "필수 런타임 누락", 
                    MessageBoxButtons.YesNo, 
                    MessageBoxIcon.Warning
                );

                if (result == DialogResult.Yes)
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "https://developer.microsoft.com/en-us/microsoft-edge/webview2/",
                        UseShellExecute = true
                    });
                }
                Application.Exit();
            } catch (Exception ex) {
                MessageBox.Show($"WebView2 초기화 실패: {ex.Message}", "System Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Application.Exit();
            }
        }

        private void StartInternalServer()
        {
            Thread serverThread = new Thread(() => {
                try {
                    HttpListener listener = new HttpListener();
                    listener.Prefixes.Add(string.Format("http://localhost:{0}/", port));
                    listener.Start();

                    while (true) {
                        HttpListenerContext context = listener.GetContext();
                        string relativePath = context.Request.Url.LocalPath.TrimStart('/');
                        
                        // Handle heartbeat (kept for compatibility, though window close handles shutdown)
                        if (relativePath == "heartbeat") {
                            context.Response.StatusCode = 200;
                            context.Response.OutputStream.Close();
                            continue;
                        }

                        if (string.IsNullOrEmpty(relativePath)) {
                            relativePath = "index.html";
                        }
                        
                        string filePath = Path.Combine(baseDir, relativePath);

                        if (File.Exists(filePath)) {
                            byte[] buffer = File.ReadAllBytes(filePath);
                            context.Response.ContentLength64 = buffer.Length;
                            
                            // Headers
                            context.Response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate");
                            context.Response.Headers.Add("Pragma", "no-cache");
                            context.Response.Headers.Add("Expires", "0");

                            context.Response.OutputStream.Write(buffer, 0, buffer.Length);
                        } else {
                            context.Response.StatusCode = 404;
                        }
                        context.Response.OutputStream.Close();
                    }
                } catch { }
            });
            serverThread.IsBackground = true;
            serverThread.Start();
        }
    }
}
