 const searchForm = document.getElementById("searchForm");
    const usernameInput = document.getElementById("usernameInput");
    const messageBox = document.getElementById("messageBox");
    const profileSection = document.getElementById("profileSection");
    const repoSection = document.getElementById("repoSection");
    const repoList = document.getElementById("repoList");
    const sortRepos = document.getElementById("sortRepos");
    const languageBox = document.getElementById("languageBox");

    let reposData = [];

    searchForm.addEventListener("submit", function(event) {
      event.preventDefault();
      const username = usernameInput.value.trim();

      if (username === "") {
        showMessage("Please enter a GitHub username.", false);
        return;
      }

      fetchDeveloper(username);
    });

    sortRepos.addEventListener("change", function() {
      renderRepos(sortRepositoryData(reposData, sortRepos.value));
    });

    async function fetchDeveloper(username) {
      showLoading();
      profileSection.classList.add("hidden");
      repoSection.classList.add("hidden");

      try {
        const profileResponse = await fetch(`https://api.github.com/users/${username}`);

        if (profileResponse.status === 404) {
          throw new Error("Developer not found. Please check the username.");
        }

        if (profileResponse.status === 403) {
          throw new Error("GitHub rate limit reached. Please try again later.");
        }

        if (!profileResponse.ok) {
          throw new Error("Something went wrong while fetching profile data.");
        }

        const profileData = await profileResponse.json();

        const repoResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);

        if (repoResponse.status === 403) {
          throw new Error("GitHub rate limit reached while fetching repositories.");
        }

        if (!repoResponse.ok) {
          throw new Error("Something went wrong while fetching repositories.");
        }

        reposData = await repoResponse.json();

        hideMessage();
        renderProfile(profileData);
        renderLanguages(reposData);
        renderRepos(sortRepositoryData(reposData, sortRepos.value));

        profileSection.classList.remove("hidden");
        repoSection.classList.remove("hidden");
      } catch (error) {
        showMessage(error.message, false);
      }
    }

    function renderProfile(user) {
      profileSection.innerHTML = `
        <article class="profile-card">
          <div class="avatar-wrap">
            <img src="${user.avatar_url}" alt="${user.login} avatar" />
          </div>
          <div class="profile-info">
            <h2>${user.name || user.login}</h2>
            <p class="username">@${user.login}</p>
            <p class="bio">${user.bio || "No bio available for this developer."}</p>
            <div class="stats">
              <div class="stat"><strong>${user.public_repos}</strong><span>Repositories</span></div>
              <div class="stat"><strong>${user.followers}</strong><span>Followers</span></div>
              <div class="stat"><strong>${user.following}</strong><span>Following</span></div>
              <div class="stat"><strong>${user.location || "N/A"}</strong><span>Location</span></div>
            </div>
            <a class="profile-link" href="${user.html_url}" target="_blank">Open GitHub Profile</a>
          </div>
        </article>
      `;
    }

    function sortRepositoryData(repos, type) {
      const copiedRepos = [...repos];

      if (type === "stars") {
        copiedRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
      } else if (type === "name") {
        copiedRepos.sort((a, b) => a.name.localeCompare(b.name));
      } else if (type === "updated") {
        copiedRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      }

      return copiedRepos;
    }

    function renderRepos(repos) {
      if (repos.length === 0) {
        repoList.innerHTML = `<div class="message">No public repositories found.</div>`;
        return;
      }

      repoList.innerHTML = repos.map(repo => `
        <article class="repo-card">
          <h3>${repo.name}</h3>
          <p>${repo.description || "No description added for this repository."}</p>
          <div class="repo-meta">
            <span>★ ${repo.stargazers_count}</span>
            <span>⑂ ${repo.forks_count}</span>
            <span>${repo.language || "Unknown"}</span>
          </div>
          <a href="${repo.html_url}" target="_blank">View Repository →</a>
        </article>
      `).join("");
    }

    function renderLanguages(repos) {
      const languages = {};

      repos.forEach(repo => {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
      });

      const languageEntries = Object.entries(languages).sort((a, b) => b[1] - a[1]);

      if (languageEntries.length === 0) {
        languageBox.innerHTML = `<h3>Language Breakdown</h3><p>No language data available.</p>`;
        return;
      }

      languageBox.innerHTML = `
        <h3>Language Breakdown</h3>
        <div class="language-list">
          ${languageEntries.map(([language, count]) => `<span class="language-pill">${language}: ${count}</span>`).join("")}
        </div>
      `;
    }

    function showLoading() {
      messageBox.classList.remove("hidden");
      messageBox.innerHTML = `<div class="loader"></div><p>Fetching developer data...</p>`;
    }

    function showMessage(message) {
      messageBox.classList.remove("hidden");
      messageBox.textContent = message;
    }

    function hideMessage() {
      messageBox.classList.add("hidden");
      messageBox.textContent = "";
    }
