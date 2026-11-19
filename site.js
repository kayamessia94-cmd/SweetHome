const menu = document.querySelector('.menu');
document.querySelector('.burger').onclick = () => menu.classList.toggle('open');

// Services dropdown opens on tap on mobile
const dd = document.querySelector('.dropdown > a');
if (dd) dd.addEventListener('click', e => {
  if (window.innerWidth <= 900) {
    e.preventDefault();
    e.currentTarget.parentElement.classList.toggle('open');
  }
});
