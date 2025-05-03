from pathlib import Path

# Folder containing your HTML files
website_folder = Path(r"C:\Users\User\Documents\work\jupiter_sg")  # Replace with your actual path

# Google Analytics code to insert
ga_script = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VX6VXK0L0H"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-VX6VXK0L0H');
</script>
"""

# Loop through all .html files
for html_file in website_folder.rglob("*.html"):
    content = html_file.read_text(encoding="utf-8")

    if "<!-- Google tag" not in content:  # Avoid duplicate injection
        modified = content.replace("<head>", f"<head>\n{ga_script}", 1)
        html_file.write_text(modified, encoding="utf-8")
        print(f"✅ Injected GA tag in: {html_file.name}")
    else:
        print(f"⚠️ Already contains GA tag: {html_file.name}")
