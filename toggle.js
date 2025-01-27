// Grab the toggle button
const darkModeToggle = document.getElementById('darkModeToggle');

// Add event listener to toggle between .dark-mode and .light-mode
darkModeToggle.addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
});
