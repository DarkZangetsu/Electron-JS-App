 // Toggle sidebar active state
 const sidebarItems = document.querySelectorAll('.sidebar-item');
 sidebarItems.forEach(item => {
   item.addEventListener('click', () => {
     sidebarItems.forEach(i => i.classList.remove('active'));
     item.classList.add('active');
   });
 });

 // Stats cards animation on scroll
 const cards = document.querySelectorAll('.stat-card');
 const observer = new IntersectionObserver(entries => {
   entries.forEach(entry => {
     if (entry.isIntersecting) {
       entry.target.style.opacity = '1';
       entry.target.style.transform = 'translateY(0)';
     }
   });
 });

 cards.forEach(card => {
   card.style.opacity = '0';
   card.style.transform = 'translateY(20px)';
   observer.observe(card);
 });