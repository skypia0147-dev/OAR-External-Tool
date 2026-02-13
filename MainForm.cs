using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

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

                webView.Source = new Uri($"http://localhost:{port}/index.html");
                
                // Optional: Disable context menu or other browser features
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                webView.CoreWebView2.Settings.IsZoomControlEnabled = true;
            } catch (Exception ex) {
                MessageBox.Show($"WebView2 Initialization Failed: {ex.Message}");
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
