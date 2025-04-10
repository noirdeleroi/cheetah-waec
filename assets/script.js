function showMessage() {
    alert("Welcome to Chaatah WAEC! Get ready to ace your exams.");
}
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
  
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('show');
      });
    }
  });
  
