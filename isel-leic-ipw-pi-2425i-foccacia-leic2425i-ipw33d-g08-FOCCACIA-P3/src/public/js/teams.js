function handleSubmiteSearch(e) {
  e.preventDefault();
  const searchInput = document.getElementById('search-teams');
  const searchValue = searchInput.value;
  if (searchValue) {
    window.location.href = `/teams?name=${searchValue}`;
  }
}
