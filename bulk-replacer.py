from pathlib import Path

# Set the folder where your HTML files are located
html_folder = Path(r"C:\Users\User\Documents\work\jupiter_sg")  # 🔁 Adjust this path to your folder

# Replacement rules
replacements = {
    '<li><a href="contact.html">Contact Us</a></li>':
    '<li><a href="contact.html">About Us</a></li>',

}

# Loop through all .html files
for file in html_folder.rglob("*.html"):
    content = file.read_text(encoding="utf-8")
    original_content = content

    for old, new in replacements.items():
        content = content.replace(old, new)

    if content != original_content:
        file.write_text(content, encoding="utf-8")
        print(f"✅ Updated: {file}")
    else:
        print(f"— Skipped (no changes): {file}")
