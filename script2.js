const toggleButton = document.getElementById("toggleHelp");
const steps = document.querySelectorAll(".step");
const explanationPanel = document.getElementById("explanation");

const explanations = {1: `
<div>
  <h3>Step 1: Express All Terms Using the Same Base</h3>
  <p><strong>Goal:</strong> Our equation involves two exponential terms: \\(2^x\\) and \\(8^x\\). Since they have different bases (2 and 8), it’s harder to work with them directly. A good strategy is to rewrite all exponential expressions with the same base.</p>

  <p><strong>Why Base 2?</strong> Because \\(8 = 2^3\\), we can express \\(8^x\\) in terms of \\(2^x\\), which simplifies the problem.</p>

  <p><strong>Use the Rule:</strong></p>
  \\[
    (a^m)^n = a^{mn}
  \\]

  <p><strong>Apply it:</strong></p>
  \\[
    8^x = (2^3)^x = 2^{3x}
  \\]

  <p><strong>Now Rewrite the Equation:</strong></p>
  \\[
    2^x + 2^{3x} = 130
  \\]

  <p>Now both terms are written as powers of the same base, which makes it easier to analyze and solve the equation.</p>
</div>
`
 ,
2: `
<div>
  <h3>Step 2: Use Substitution</h3>
  <p><strong>Goal:</strong> Simplify the equation by replacing powers of 2 with a single variable.</p>

  <p>We already rewrote the equation as:</p>
  \\[
    2^x + 2^{3x} = 130
  \\]

  <p>Let’s use the substitution \\(y = 2^x\\). This makes the equation easier to work with because we’re now using a single variable.</p>

  <p><strong>Why this helps:</strong> If \\(y = 2^x\\), then \\(2^{3x} = (2^x)^3 = y^3\\).</p>

  <p><strong>Substitute into the equation:</strong></p>
  \\[
    y + y^3 = 130
  \\]

  <p>Now we have a cubic equation in terms of \\(y\\), which is much easier to handle than dealing with mixed exponents directly.</p>
</div>
`,

3: `
<div>
  <h3>Step 3: Rearrange the Equation</h3>
  <p>We now have:</p>
  \\[
    y^3 + y = 130
  \\]

  <p><strong>Goal:</strong> Rearrange the equation so one side equals 0. This is the standard form we use to solve polynomial equations.</p>

  <p>Subtract 130 from both sides:</p>
  \\[
    y^3 + y - 130 = 0
  \\]

  <p>Now we have a standard cubic equation in the form:</p>
  \\[
    ay^3 + by^2 + cy + d = 0
  \\]

  <p>In this case, \\(a = 1\\), \\(b = 0\\), \\(c = 1\\), and \\(d = -130\\).</p>
</div>
`,

 4: `
<div>
  <h3>Step 4: Solve the Cubic Equation</h3>
  <p><strong>Equation:</strong></p>
  \\[
    y^3 + y - 130 = 0
  \\]

  <p>We try rational roots using the Rational Root Theorem. It says we should test values that divide the constant term (\\(-130\\)).</p>

  <p>Let’s test \\(y = 5\\):</p>
  \\[
    5^3 + 5 = 125 + 5 = 130
  \\]

  <p>It works! So \\(y = 5\\) is a root of the equation.</p>

  <p><strong>So what does this mean?</strong> Since we defined \\(y = 2^x\\), this gives:</p>
  \\[
    2^x = 5
  \\]
</div>
`,

  5: `
<div>
  <h3>Step 5: Solve for \\(x\\)</h3>
  <p>We now have the equation:</p>
  \\[
    2^x = 5
  \\]

  <p><strong>Goal:</strong> Solve for \\(x\\) using logarithms.</p>

  <p>Take logarithm base 2 of both sides:</p>
  \\[
    x = \\log_2 5
  \\]

  <p>If your calculator only supports base 10 or natural logs, you can convert using the change of base formula:</p>
  \\[
    x = \\frac{\\log 5}{\\log 2}
  \\]

  <p>This is the final solution to the original equation.</p>

  <p><strong>Final Answer:</strong></p>
  \\[
    \\boxed{x = \\log_2 5}
  \\]
</div>
`
};

let helpMode = false;

toggleButton.addEventListener("click", () => {
  helpMode = !helpMode;
  toggleButton.textContent = helpMode ? "Oh I get it now!" : "I'm stupid help me";
  explanationPanel.innerHTML = "<p>Select a step to get more help.</p>";

  steps.forEach(step => {
    if (helpMode) {
      step.classList.add("help-mode");
      step.addEventListener("click", handleStepClick);
    } else {
      step.classList.remove("help-mode");
      step.removeEventListener("click", handleStepClick);
    }
  });
});

function handleStepClick(e) {
  const step = e.currentTarget;
  const stepNum = step.dataset.step;
  explanationPanel.innerHTML = `<p><strong>Detailed Explanation for Step ${stepNum}:</strong><br>${explanations[stepNum]}</p>`;
  MathJax.typeset(); // Re-render LaTeX
}
