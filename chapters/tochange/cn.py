import os
import re

folder_path = R"C:\Users\User\Documents\work\jupiter_sg\chapters\tochange"
script_line = '<script defer src="../../assets/script.js"></script>'

old_nav_pattern = re.compile(
    r'<nav>\s*<div class="nav-container">.*?</nav>', re.DOTALL
)

new_nav_block = '''<nav>
  <div class="nav-container">
    <h1 style="display: flex; align-items: center;">
      <a href="../../index.html" style="text-decoration: none; color: inherit; display: flex; align-items: center;">
        <img src="../../assets/images/logo.png" alt="Cheetah WAEC Logo" style="height:40px; vertical-align:middle; margin-right:10px;">
        <span>Cheetah WAEC</span>
      </a>
    </h1>
    <button class="menu-toggle">☰</button>
    <ul class="nav-links">
      <li><a href="../../index.html">Home</a></li>
      <li><a href="../../study-guide.html">Study Guide</a></li>
      <li><a href="../../past-papers.html">Past Papers</a></li>
      <li><a href="#">Telegram Bot</a></li>
      <li><a href="../../contact.html">Contact Us</a></li>
      <li><a href="../../subscribe.html" class="subscribe-btn">Subscribe</a></li>
    </ul>
  </div>
</nav>
'''

modified_files = []

for filename in os.listdir(folder_path):
    if filename.endswith(".html"):
        filepath = os.path.join(folder_path, filename)

        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()

        original_content = content

        # Add <script defer> if not already there
        if script_line not in content:
            content = content.replace("<head>", f"<head>\n    {script_line}")

        # Replace old nav block
        content, count = old_nav_pattern.subn(new_nav_block, content)

        if content != original_content:
            with open(filepath, "w", encoding="utf-8") as file:
                file.write(content)
            modified_files.append(filename)

# Output which files were changed
print("✅ Modified files:")
for file in modified_files:
    print(" -", file)

if not modified_files:
    print("ℹ️ No changes were necessary.")
