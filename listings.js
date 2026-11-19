function initListings(items, mode) {
  const grid = document.getElementById('cards');
  const count = document.getElementById('count');
  const fArea = document.getElementById('f-area');
  const fType = document.getElementById('f-type');
  const fBudget = document.getElementById('f-budget');

  const money = n => 'UGX ' + n.toLocaleString('en-US') + (mode === 'rent' ? ' / month' : '');
  const budgets = mode === 'rent'
    ? [500000, 1000000, 2000000, 5000000]
    : [150000000, 300000000, 600000000, 1000000000];

  [...new Set(items.map(i => i.area))].sort().forEach(a => fArea.add(new Option(a, a)));
  [...new Set(items.map(i => i.type))].sort().forEach(t => fType.add(new Option(t, t)));
  budgets.forEach(b => fBudget.add(new Option('Up to UGX ' + b.toLocaleString('en-US'), b)));

  function draw() {
    const list = items.filter(i =>
      (!fArea.value || i.area === fArea.value) &&
      (!fType.value || i.type === fType.value) &&
      (!fBudget.value || i.price <= +fBudget.value));
    count.textContent = list.length + (list.length === 1 ? ' property found' : ' properties found');
    grid.innerHTML = list.map(i => `
      <article class="card">
        <img src="${i.img}" alt="${i.name}" loading="lazy">
        <div class="card-body">
          <h3>${i.name}</h3>
          <p class="meta">${i.area} &middot; ${i.type}</p>
          <p class="meta">${i.beds} bed &middot; ${i.baths} bath</p>
          <p class="price">${money(i.price)}</p>
          <a class="btn btn-sm btn-link" href="contact.html">${mode === 'rent' ? 'Book a visit' : 'Enquire'}</a>
        </div>
      </article>`).join('') || '<p>No property matches these filters.</p>';
  }
  [fArea, fType, fBudget].forEach(f => f.addEventListener('change', draw));
  draw();
}
