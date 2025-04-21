import os
import re

input_folder = r"C:\Users\User\Downloads\latex_problems_solutions_2019_2023\2023"
output_file = r"C:\Users\User\Downloads\latex_problems_solutions_2019_2023\Outpu\combined.txt"

with open(output_file, "w", encoding="utf-8") as outfile:
    for i, filename in enumerate(sorted(os.listdir(input_folder), key=lambda f: int(f.split("_")[1].split(".")[0])), 1):
        if filename.endswith(".txt"):
            file_path = os.path.join(input_folder, filename)

            with open(file_path, "r", encoding="utf-8") as infile:
                contents = infile.read()

                # Insert a bold centered "Problem i"
                outfile.write(f"\\begin{{center}}\\textbf{{Problem {i}}}\\end{{center}}\n\n")

                # Replace full image path with just {filename.png} and add spacing
              # Replace full image paths in \includegraphics{} for both folders
# Replace image paths inside \includegraphics with or without double curly braces
                contents = re.sub(
                    r'\\includegraphics\[.*?\]\{\{?/home/alex/Downloads/pics_waec/latex_code_(?:images|solutions)/(.+?)\}?\}',
                    r'\\includegraphics[width=0.9\\textwidth]{\1}\n\n\\vspace{0.3cm}',
                    contents
                )


                # Add newline and space before "Possible answers:"
                contents = re.sub(
                    r"(Possible answers:)",
                    r"\n\n\1",
                    contents
                )
                contents = re.sub(r"\s*(?=([A-D])\.\s)", r"\n", contents)

                # Add newline and spacing before "Correct answer:"
                contents = re.sub(
                    r"\n*Correct answer: ([ABCD])\s*",
                    r"\n\n\\vspace{0.3cm}\n\\begin{center}Correct answer: \1\\end{center}\n",
                    contents
                )


                # Add newline and spacing before "Solution:"
                contents = re.sub(
                    r"\\textbf\{Solution\.\}",
                    r"\n\n\\begin{center}\\textbf{Solution.}\\end{center}\n\\vspace{0.4cm}\n",
                    contents
                )




                outfile.write(contents)
                outfile.write("\n\\newpage\n\n")  # New page after each problem
