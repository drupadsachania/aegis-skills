// First-paint theme (external file: the dashboard CSP forbids inline scripts).
// Light is the default. Dark only if the user chose it with the toggle; prefers-color-scheme is never read.
try {
  if (localStorage.getItem('themis-theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
    var m = document.querySelector('meta[name=color-scheme]')
    if (m) m.setAttribute('content', 'dark')
  }
} catch (e) { /* storage unavailable: stay light */ }
