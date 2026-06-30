const searchForm = document.getElementById("searchForm");
const usernameInput = document.getElementById("usernameInput");
const messageBox = document.getElementById("messageBox");
const profileSection = document.getElementById("profileSection");
const repoSection = document.getElementById("repoSection");
const repoList = document.getElementById("repoList");
const sortRepos = document.getElementById("sortRepos");
const languageBox = document.getElementById("languageBox");

let reposData = [];

const CACHE_KEY = "githubDeveloperCache";
const CACHE_DURATION = 6 * 60 * 60 * 1000; 
// 6 hours

const demoProfileData = {
    avatar_url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    login: "demo-developer",
    name: "Demo Developer",
    bio: "Frontend Developer | JavaScript | GitHub API Project Demo",
    public_repos: 6,
    followers: 120,
    following: 45,
    location: "India",
    html_url: "https://github.com"
};

const demoReposData = [
    {
        name: "portfolio-website",
        description: "A modern personal portfolio website using HTML, CSS and JavaScript.",
        stargazers_count: 24,
        forks_count: 8,
        language: "JavaScript",
        updated_at: "2026-06-20T10:00:00Z",
        html_url: "https://github.com"
    },
    {
        name: "expense-tracker",
        description: "Expense tracker app with localStorage support.",
        stargazers_count: 18,
        forks_count: 5,
        language: "JavaScript",
        updated_at: "2026-06-18T10:00:00Z",
        html_url: "https://github.com"
    },
    {
        name: "github-explorer",
        description: "A GitHub profile finder using GitHub API.",
        stargazers_count: 32,
        forks_count: 11,
        language: "JavaScript",
        updated_at: "2026-06-25T10:00:00Z",
        html_url: "https://github.com"
    },
    {
        name: "kanban-board",
        description: "Task management board with drag and drop features.",
        stargazers_count: 15,
        forks_count: 4,
        language: "HTML",
        updated_at: "2026-06-15T10:00:00Z",
        html_url: "https://github.com"
    },
    {
        name: "quiz-app",
        description: "Interactive quiz application with score tracking.",
        stargazers_count: 12,
        forks_count: 3,
        language: "CSS",
        updated_at: "2026-06-13T10:00:00Z",
        html_url: "https://github.com"
    },
    {
        name: "news-feed-app",
        description: "News feed aggregator project using async JavaScript.",
        stargazers_count: 21,
        forks_count: 7,
        language: "JavaScript",
        updated_at: "2026-06-22T10:00:00Z",
        html_url: "https://github.com"
    }
];

searchForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = usernameInput.value.trim();

    if (username === "") {
        showMessage("Please enter a GitHub username.");
        return;
    }

    fetchDeveloper(username);
});

sortRepos.addEventListener("change", function() {
    renderRepos(sortRepositoryData(reposData, sortRepos.value));
});

function getCache() {
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (!cachedData) {
        return {};
    }

    try {
        return JSON.parse(cachedData);
    } catch (error) {
        localStorage.removeItem(CACHE_KEY);
        return {};
    }
}

function saveToCache(username, profileData, reposData) {
    const cache = getCache();
    const key = username.toLowerCase();

    cache[key] = {
        profileData: profileData,
        reposData: reposData,
        savedAt: Date.now()
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function getFromCache(username) {
    const cache = getCache();
    const key = username.toLowerCase();

    const cachedUser = cache[key];

    if (!cachedUser) {
        return null;
    }

    const isExpired = Date.now() - cachedUser.savedAt > CACHE_DURATION;

    if (isExpired) {
        delete cache[key];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return null;
    }

    return cachedUser;
}

function renderDemoData(reason) {
    reposData = demoReposData;

    renderProfile(demoProfileData);
    renderLanguages(reposData);
    renderRepos(sortRepositoryData(reposData, sortRepos.value));

    profileSection.classList.remove("hidden");
    repoSection.classList.remove("hidden");

    messageBox.classList.remove("hidden");
    messageBox.textContent = reason + " Showing demo data for presentation.";
}

async function fetchDeveloper(username) {
    showLoading();

    profileSection.classList.add("hidden");
    repoSection.classList.add("hidden");

    const cachedUser = getFromCache(username);

    if (cachedUser) {
        reposData = cachedUser.reposData;

        hideMessage();
        renderProfile(cachedUser.profileData);
        renderLanguages(reposData);
        renderRepos(sortRepositoryData(reposData, sortRepos.value));

        profileSection.classList.remove("hidden");
        repoSection.classList.remove("hidden");

        return;
    }

    try {
        const profileResponse = await fetch(
            `https://api.github.com/users/${username}`
        );

        if (profileResponse.status === 404) {
            renderDemoData("Developer not found.");
            return;
        }

        if (profileResponse.status === 403 || profileResponse.status === 429) {
            renderDemoData("GitHub rate limit reached.");
            return;
        }

        if (!profileResponse.ok) {
            renderDemoData("Unable to fetch GitHub profile.");
            return;
        }

        const profileData = await profileResponse.json();

        const repoResponse = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
        );

        if (repoResponse.status === 403 || repoResponse.status === 429) {
            renderDemoData("GitHub repository rate limit reached.");
            return;
        }

        if (!repoResponse.ok) {
            renderDemoData("Unable to fetch GitHub repositories.");
            return;
        }

        reposData = await repoResponse.json();

        saveToCache(username, profileData, reposData);

        hideMessage();
        renderProfile(profileData);
        renderLanguages(reposData);
        renderRepos(sortRepositoryData(reposData, sortRepos.value));

        profileSection.classList.remove("hidden");
        repoSection.classList.remove("hidden");
    } catch (error) {
        renderDemoData("Network issue detected.");
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

                <p class="bio">
                    ${user.bio || "No bio available for this developer."}
                </p>

                <div class="stats">
                    <div class="stat">
                        <strong>${user.public_repos}</strong>
                        <span>Repositories</span>
                    </div>

                    <div class="stat">
                        <strong>${user.followers}</strong>
                        <span>Followers</span>
                    </div>

                    <div class="stat">
                        <strong>${user.following}</strong>
                        <span>Following</span>
                    </div>

                    <div class="stat">
                        <strong>${user.location || "N/A"}</strong>
                        <span>Location</span>
                    </div>
                </div>

                <a class="profile-link" href="${user.html_url}" target="_blank">
                    Open GitHub Profile
                </a>
            </div>
        </article>
    `;
}

function sortRepositoryData(repos, type) {
    const copiedRepos = [...repos];

    if (type === "stars") {
        copiedRepos.sort(function(a, b) {
            return b.stargazers_count - a.stargazers_count;
        });
    } else if (type === "name") {
        copiedRepos.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
    } else if (type === "updated") {
        copiedRepos.sort(function(a, b) {
            return new Date(b.updated_at) - new Date(a.updated_at);
        });
    }

    return copiedRepos;
}

function renderRepos(repos) {
    if (repos.length === 0) {
        repoList.innerHTML = `
            <div class="message">
                No public repositories found.
            </div>
        `;
        return;
    }

    repoList.innerHTML = repos.map(function(repo) {
        return `
            <article class="repo-card">
                <h3>${repo.name}</h3>

                <p>
                    ${repo.description || "No description added for this repository."}
                </p>

                <div class="repo-meta">
                    <span>★ ${repo.stargazers_count}</span>
                    <span>⑂ ${repo.forks_count}</span>
                    <span>${repo.language || "Unknown"}</span>
                </div>

                <a href="${repo.html_url}" target="_blank">
                    View Repository →
                </a>
            </article>
        `;
    }).join("");
}

function renderLanguages(repos) {
    const languages = {};

    repos.forEach(function(repo) {
        if (repo.language) {
            languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
    });

    const languageEntries = Object.entries(languages).sort(function(a, b) {
        return b[1] - a[1];
    });

    if (languageEntries.length === 0) {
        languageBox.innerHTML = `
            <h3>Language Breakdown</h3>
            <p>No language data available.</p>
        `;
        return;
    }

    languageBox.innerHTML = `
        <h3>Language Breakdown</h3>

        <div class="language-list">
            ${languageEntries.map(function(item) {
                const language = item[0];
                const count = item[1];

                return `
                    <span class="language-pill">
                        ${language}: ${count}
                    </span>
                `;
            }).join("")}
        </div>
    `;
}

function showLoading() {
    messageBox.classList.remove("hidden");

    messageBox.innerHTML = `
        <div class="loader"></div>
        <p>Fetching developer data...</p>
    `;
}

function showMessage(message) {
    messageBox.classList.remove("hidden");
    messageBox.textContent = message;
}

function hideMessage() {
    messageBox.classList.add("hidden");
    messageBox.textContent = "";
}
