import os

folder_path = R"C:\Users\User\Documents\work\jupiter_sg\chapters\tochange"
old_path = "assets/images/logo.png"
new_path = "../assets/images/logo.png"

modified_files = []

for filename in os.listdir(folder_path):
    if filename.endswith(".html"):
        filepath = os.path.join(folder_path, filename)

        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()

        if old_path in content:
            content = content.replace(old_path, new_path)
            with open(filepath, "w", encoding="utf-8") as file:
                file.write(content)
            modified_files.append(filename)

# Report
if modified_files:
    print("✅ Updated logo path in the following files:")
    for file in modified_files:
        print(" -", file)
else:
    print("ℹ️ No files needed updating.")
