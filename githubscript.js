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
const TOKEN_KEY = "githubAccessToken";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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

function getGitHubToken() {
    let token = sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
        token = prompt("Enter your GitHub access token for real API data:");

        if (token && token.trim() !== "") {
            token = token.trim();
            sessionStorage.setItem(TOKEN_KEY, token);
        }
    }

    return token;
}

function getHeaders() {
    const token = getGitHubToken();

    const headers = {
        Accept: "application/vnd.github+json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

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

function getRateLimitMessage(response) {
    const resetTime = response.headers.get("x-ratelimit-reset");

    if (resetTime) {
        const resetDate = new Date(Number(resetTime) * 1000);

        return `GitHub rate limit reached. Try again after ${resetDate.toLocaleTimeString()}.`;
    }

    return "GitHub rate limit reached. Please try again later.";
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
        const headers = getHeaders();

        const profileResponse = await fetch(
            `https://api.github.com/users/${username}`,
            {
                method: "GET",
                headers: headers
            }
        );

        if (profileResponse.status === 404) {
            throw new Error("Developer not found. Please check the username.");
        }

        if (profileResponse.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            throw new Error("GitHub token is invalid. Please enter a valid token.");
        }

        if (profileResponse.status === 403 || profileResponse.status === 429) {
            throw new Error(getRateLimitMessage(profileResponse));
        }

        if (!profileResponse.ok) {
            throw new Error("Something went wrong while fetching profile data.");
        }

        const profileData = await profileResponse.json();

        const repoResponse = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
            {
                method: "GET",
                headers: headers
            }
        );

        if (repoResponse.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            throw new Error("GitHub token is invalid. Please enter a valid token.");
        }

        if (repoResponse.status === 403 || repoResponse.status === 429) {
            throw new Error(getRateLimitMessage(repoResponse));
        }

        if (!repoResponse.ok) {
            throw new Error("Something went wrong while fetching repositories.");
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
        showMessage(error.message);
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
        <p>Fetching real GitHub data...</p>
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
