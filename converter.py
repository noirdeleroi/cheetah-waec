from pathlib import Path
import re
import html

def preserve_math_blocks(tex):
    math_blocks = []

    # Convert $...$ and $$...$$ to MathJax-friendly
    tex = re.sub(r'\$(.+?)\$', r'\\(\1\\)', tex)
    tex = re.sub(r'\$\$(.+?)\$\$', r'\\[\1\\]', tex, flags=re.DOTALL)

    def math_replacer(match):
        math_blocks.append(match.group(0))
        return f"__MATH_BLOCK_{len(math_blocks) - 1}__"

    tex = re.sub(r'\\\[(.*?)\\\]', math_replacer, tex, flags=re.DOTALL)
    tex = re.sub(r'\\\((.*?)\\\)', math_replacer, tex, flags=re.DOTALL)

    # Convert align* environments to display math blocks
# Wrap align* environments in display math block
    tex = re.sub(
    r'\\begin{align\*}(.*?)\\end{align\*}',
    lambda m: f'\\[\n\\begin{{align*}}\n{m.group(1).strip()}\n\\end{{align*}}\n\\]',
    tex,
    flags=re.DOTALL
)

    return tex, math_blocks


def restore_math_blocks(html, math_blocks):
    for i, block in enumerate(math_blocks):
        html = html.replace(f"__MATH_BLOCK_{i}__", block)
    return html

def convert_text_to_html(tex):
    tex = re.sub(r'\\text{([^}]*)}', r'\1', tex)
    tex = tex.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    tex = re.sub(r'\\vspace{([\-0-9.]+)cm}', lambda m: (
        f'<div style="margin-top:{m.group(1)}cm;"></div>' if float(m.group(1)) >= 0.2 else ''
    ), tex)
    tex = re.sub(r'\\section\*{(.+?)}', r'<h2>\1</h2>', tex)
    tex = re.sub(r'\\subsection\*{(.+?)}', r'<h3 class="subsection-title">\1</h3>', tex)
    tex = re.sub(r'\\paragraph{(.+?)}', r'<p><strong>\1</strong></p>', tex)

    tex = re.sub(r'\\textbf{(.+?)}', r'<p><strong>\1</strong></p>', tex)
    tex = tex.replace("\\begin{itemize}", "<ul>")
    tex = tex.replace("\\end{itemize}", "</ul>")
    tex = tex.replace("\\item", "<li>")
    tex = tex.replace("\n\n", "<br><br>")
    tex = re.sub(
    r'\\captionof\{figure\}\{(.+?)\}',
    r'<figcaption style="text-align: center; font-style: italic; margin-top: 8px;">\1</figcaption>',
    tex
)



    tex = re.sub(
    r'\\includegraphics\[width=([0-9.]+)\\textwidth\]{(.+?)}',
    lambda m: f'<div style="text-align:center;"><img src="../../assets/images/{html.escape(m.group(2))}" style="width:{float(m.group(1)) * 100}%"></div>',
    tex
)

    return tex

def remove_boilerplate(tex):
    tex = re.sub(r'\\documentclass.*?{.*?}', '', tex)
    tex = re.sub(r'\\usepackage{.*?}', '', tex)
    tex = re.sub(r'\\title{.*?}', '', tex)
    tex = re.sub(r'\\author{.*?}', '', tex)
    tex = re.sub(r'\\date{.*?}', '', tex)
    tex = re.sub(r'\\begin{document}', '', tex)
    tex = re.sub(r'\\end{document}', '', tex)
    tex = tex.replace("\\begin{flushleft}", "")
    tex = tex.replace("\\end{flushleft}", "")

    # Convert \vspace{Xcm} to HTML spacing


    tex = tex.replace("\\begin{center}", "")
    tex = tex.replace("\\end{center}", "")
    return tex

def remove_comments_and_blanks(tex):
    lines = tex.splitlines()
    return '\n'.join(line for line in lines if line.strip() and not line.strip().startswith('%'))

def convert_tex_to_html(tex_path, template, output_folder):
    tex_raw = tex_path.read_text(encoding="utf-8")
    cleaned = remove_boilerplate(tex_raw)
    cleaned = remove_comments_and_blanks(cleaned)

    tex_with_placeholders, math_blocks = preserve_math_blocks(cleaned)
    html_converted = convert_text_to_html(tex_with_placeholders)
    final_content = restore_math_blocks(html_converted, math_blocks)

    final_html = template.replace("<!-- {{CONTENT}} -->", final_content)
    final_html = final_html.replace("{{TITLE}}", tex_path.stem)

    output_path = output_folder / f"{tex_path.stem}.html"
    output_path.write_text(final_html, encoding="utf-8")
    print(f"✅ Converted: {tex_path.name} → {output_path.name}")

def batch_convert(folder_path, template_path, output_folder):
    folder = Path(folder_path)
    template = Path(template_path).read_text(encoding="utf-8")
    output = Path(output_folder)
    output.mkdir(parents=True, exist_ok=True)

    for tex_file in folder.glob("*.tex"):
        convert_tex_to_html(tex_file, template, output)

# Example usage:
if __name__ == "__main__":

    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch1",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template1.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\numbers"       # 📁 Folder to save .html files
    )

    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch2",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template2.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\algebra"       # 📁 Folder to save .html files
    )
    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch3",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template3.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\geometry"       # 📁 Folder to save .html files
    )
    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch4",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template4.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\Trigonometry"       # 📁 Folder to save .html files
    )
    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch5",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template5.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\statistics"       # 📁 Folder to save .html files
    )
    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch6",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template6.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\probability"       # 📁 Folder to save .html files
    )
    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch7",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template7.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\commertial-mathematics"       # 📁 Folder to save .html files
    )
    batch_convert(
        folder_path=r"C:\Users\User\Documents\work\jupiter_sg\ch8",             # 📁 Folder with .tex files
        template_path=r"C:\Users\User\Documents\work\jupiter_sg\template8.html",      # 📄 Path to template.html
        output_folder=r"C:\Users\User\Documents\work\jupiter_sg\chapters\miscellaneous"       # 📁 Folder to save .html files
    )

