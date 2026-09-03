// ==========================================
// SKOOL — JAVASCRIPT V1
// ==========================================

// ==========================================
// CONFIGURATION SUPABASE
// ==========================================

const SUPABASE_URL = "https://hlfouclokizbrbwsbeuk.supabase.co";
const SUPABASE_KEY = "sb_publishable_3ErTaFjBvVP_9yXzSbTkdg_XUodIKKp";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;
let currentClass = null;


// ==========================================
// ÉLÉMENTS
// ==========================================

const authScreen = document.getElementById("auth-screen");
const classScreen = document.getElementById("class-screen");
const mainScreen = document.getElementById("main-screen");


// ==========================================
// UTILITAIRES
// ==========================================

function showScreen(screen) {
    document.querySelectorAll(".screen").forEach(element => {
        element.classList.remove("active");
    });

    screen.classList.add("active");
}

function setError(elementId, message) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = message || "";
    }
}

function clearErrors() {
    setError("login-error", "");
    setError("register-error", "");
    setError("class-error", "");
}

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}


// ==========================================
// AFFICHER LES FORMULAIRES CONNEXION / INSCRIPTION
// ==========================================

document.getElementById("show-register").addEventListener("click", () => {
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("register-form").classList.remove("hidden");

    clearErrors();
});

document.getElementById("show-login").addEventListener("click", () => {
    document.getElementById("register-form").classList.add("hidden");
    document.getElementById("login-form").classList.remove("hidden");

    clearErrors();
});


// ==========================================
// INSCRIPTION
// ==========================================

document.getElementById("register-button").addEventListener("click", async () => {

    clearErrors();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    if (!name) {
        setError("register-error", "Entre ton prénom.");
        return;
    }

    if (!email) {
        setError("register-error", "Entre ton adresse e-mail.");
        return;
    }

    if (!password || password.length < 6) {
        setError(
            "register-error",
            "Le mot de passe doit contenir au moins 6 caractères."
        );
        return;
    }

    const button = document.getElementById("register-button");

    button.disabled = true;
    button.textContent = "Création...";

    try {

        const { data, error } = await db.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                }
            }
        });

        if (error) {
            throw error;
        }

        /*
         * Si la confirmation e-mail est activée dans Supabase,
         * session sera null et l'utilisateur devra confirmer son adresse.
         */

        if (!data.session) {

            setError(
                "register-error",
                "Compte créé ! Vérifie ton adresse e-mail pour continuer."
            );

            button.disabled = false;
            button.textContent = "Créer mon compte";

            return;
        }

        currentUser = data.user;

        await loadUserClass();

    } catch (error) {

        console.error(error);

        setError(
            "register-error",
            error.message || "Impossible de créer le compte."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Créer mon compte";
    }
});


// ==========================================
// CONNEXION
// ==========================================

document.getElementById("login-button").addEventListener("click", async () => {

    clearErrors();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        setError(
            "login-error",
            "Entre ton adresse e-mail et ton mot de passe."
        );
        return;
    }

    const button = document.getElementById("login-button");

    button.disabled = true;
    button.textContent = "Connexion...";

    try {

        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        currentUser = data.user;

        await loadUserClass();

    } catch (error) {

        console.error(error);

        setError(
            "login-error",
            error.message || "Impossible de se connecter."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Se connecter";
    }
});


// ==========================================
// CHARGER LA CLASSE DE L'UTILISATEUR
// ==========================================

async function loadUserClass() {

    if (!currentUser) {
        showScreen(authScreen);
        return;
    }

    clearErrors();

    try {

        const { data: classData, error: classError } = await db
            .rpc("get_my_class");
        
        if (classError) {
            throw classError;
        }
        
        if (!classData || !classData.id) {
            showScreen(classScreen);
            return;
        }
        
        currentClass = classData;

        await openMainApp();

    } catch (error) {

        console.error(error);

        setError(
            "class-error",
            error.message || "Impossible de charger ta classe."
        );

        showScreen(classScreen);
    }
}


// ==========================================
// CRÉER UNE CLASSE
// ==========================================

document.getElementById("create-class-button").addEventListener("click", async () => {

    clearErrors();

    const name = document.getElementById("new-class-name").value.trim();

    if (!name) {
        setError("class-error", "Entre un nom pour ta classe.");
        return;
    }

    const button = document.getElementById("create-class-button");

    button.disabled = true;
    button.textContent = "Création...";

    try {

        const { data, error } = await db.rpc("create_class", {
            p_name: name
        });

        if (error) {
            throw error;
        }

        /*
         * La fonction SQL retourne la classe créée.
         */

        currentClass = Array.isArray(data) ? data[0] : data;

        if (!currentClass || !currentClass.id) {
            throw new Error("La classe n'a pas pu être récupérée.");
        }

        document.getElementById("new-class-name").value = "";

        await openMainApp();

    } catch (error) {

        console.error(error);

        setError(
            "class-error",
            error.message || "Impossible de créer la classe."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Créer la classe";
    }
});


// ==========================================
// REJOINDRE UNE CLASSE
// ==========================================

document.getElementById("join-class-button").addEventListener("click", async () => {

    clearErrors();

    const code = document
        .getElementById("join-class-code")
        .value
        .trim()
        .toUpperCase();

    if (!code) {
        setError("class-error", "Entre le code de la classe.");
        return;
    }

    const button = document.getElementById("join-class-button");

    button.disabled = true;
    button.textContent = "Connexion...";

    try {

        const { data, error } = await db.rpc("join_class", {
            p_join_code: code
        });

        if (error) {
            throw error;
        }

        currentClass = Array.isArray(data) ? data[0] : data;

        if (!currentClass || !currentClass.id) {
            throw new Error("La classe n'a pas pu être récupérée.");
        }

        document.getElementById("join-class-code").value = "";

        await openMainApp();

    } catch (error) {

        console.error(error);

        setError(
            "class-error",
            error.message || "Code incorrect ou impossible de rejoindre la classe."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Rejoindre";
    }
});


// ==========================================
// OUVRIR L'APPLICATION
// ==========================================

async function openMainApp() {

    showScreen(mainScreen);

    const userName =
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split("@")[0] ||
        "Élève";

    document.getElementById("welcome-name").textContent =
        `Bonjour ${userName} !`;

    document.getElementById("current-class-name").textContent =
        currentClass.name;

    document.getElementById("current-class-code").textContent =
        currentClass.join_code;

    await loadAllData();
}


// ==========================================
// NAVIGATION
// ==========================================

document.querySelectorAll(".nav-button").forEach(button => {

    button.addEventListener("click", () => {

        const pageName = button.dataset.page;

        switchPage(pageName);
    });
});


document.querySelectorAll("[data-page-target]").forEach(button => {

    button.addEventListener("click", () => {

        const pageName = button.dataset.pageTarget;

        switchPage(pageName);
    });
});


function switchPage(pageName) {

    document.querySelectorAll(".nav-button").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const page = document.getElementById(`page-${pageName}`);

    if (page) {
        page.classList.add("active");
    }
}


// ==========================================
// DÉCONNEXION
// ==========================================

document.getElementById("logout-button").addEventListener("click", async () => {

    try {

        await db.auth.signOut();

    } catch (error) {

        console.error(error);

    }

    currentUser = null;
    currentClass = null;

    showScreen(authScreen);

    document.getElementById("login-form").classList.remove("hidden");
    document.getElementById("register-form").classList.add("hidden");

    document.getElementById("login-email").value = "";
    document.getElementById("login-password").value = "";

    clearErrors();
});


// ==========================================
// COURS
// ==========================================

document.getElementById("add-course-button").addEventListener("click", () => {

    document.getElementById("course-form").classList.remove("hidden");
});

document.getElementById("cancel-course-button").addEventListener("click", () => {

    document.getElementById("course-form").classList.add("hidden");

    document.getElementById("course-subject").value = "";
    document.getElementById("course-title").value = "";
    document.getElementById("course-content").value = "";
});

document.getElementById("save-course-button").addEventListener("click", async () => {

    if (!currentUser || !currentClass) {
        return;
    }

    const subject = document.getElementById("course-subject").value.trim();
    const title = document.getElementById("course-title").value.trim();
    const content = document.getElementById("course-content").value.trim();

    if (!subject || !title || !content) {
        alert("Remplis tous les champs du cours.");
        return;
    }

    const button = document.getElementById("save-course-button");

    button.disabled = true;
    button.textContent = "Ajout...";

    try {

        const { error } = await db
            .from("courses")
            .insert({
                class_id: currentClass.id,
                user_id: currentUser.id,
                subject: subject,
                title: title,
                content: content
            });

        if (error) {
            throw error;
        }

        document.getElementById("course-form").classList.add("hidden");

        document.getElementById("course-subject").value = "";
        document.getElementById("course-title").value = "";
        document.getElementById("course-content").value = "";

        await loadCourses();

    } catch (error) {

        console.error(error);

        alert(
            error.message || "Impossible d'ajouter le cours."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Ajouter le cours";
    }
});


// ==========================================
// DEVOIRS
// ==========================================

document.getElementById("add-homework-button").addEventListener("click", () => {

    document.getElementById("homework-form").classList.remove("hidden");
});

document.getElementById("cancel-homework-button").addEventListener("click", () => {

    document.getElementById("homework-form").classList.add("hidden");

    document.getElementById("homework-subject").value = "";
    document.getElementById("homework-title").value = "";
    document.getElementById("homework-description").value = "";
    document.getElementById("homework-date").value = "";
});

document.getElementById("save-homework-button").addEventListener("click", async () => {

    if (!currentUser || !currentClass) {
        return;
    }

    const subject = document.getElementById("homework-subject").value.trim();
    const title = document.getElementById("homework-title").value.trim();
    const description = document
        .getElementById("homework-description")
        .value
        .trim();

    const dueDate = document.getElementById("homework-date").value;

    if (!subject || !title || !dueDate) {
        alert("Remplis la matière, le titre et la date.");
        return;
    }

    const button = document.getElementById("save-homework-button");

    button.disabled = true;
    button.textContent = "Ajout...";

    try {

        const { error } = await db
            .from("homework")
            .insert({
                class_id: currentClass.id,
                user_id: currentUser.id,
                subject: subject,
                title: title,
                description: description,
                due_date: dueDate
            });

        if (error) {
            throw error;
        }

        document.getElementById("homework-form").classList.add("hidden");

        document.getElementById("homework-subject").value = "";
        document.getElementById("homework-title").value = "";
        document.getElementById("homework-description").value = "";
        document.getElementById("homework-date").value = "";

        await loadHomework();

    } catch (error) {

        console.error(error);

        alert(
            error.message || "Impossible d'ajouter le devoir."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Ajouter le devoir";
    }
});


// ==========================================
// ÉVÉNEMENTS
// ==========================================

document.getElementById("add-event-button").addEventListener("click", () => {

    document.getElementById("event-form").classList.remove("hidden");
});

document.getElementById("cancel-event-button").addEventListener("click", () => {

    document.getElementById("event-form").classList.add("hidden");

    document.getElementById("event-title").value = "";
    document.getElementById("event-description").value = "";
    document.getElementById("event-date").value = "";
    document.getElementById("event-type").value = "other";
});

document.getElementById("save-event-button").addEventListener("click", async () => {

    if (!currentUser || !currentClass) {
        return;
    }

    const title = document.getElementById("event-title").value.trim();

    const description = document
        .getElementById("event-description")
        .value
        .trim();

    const eventDate = document.getElementById("event-date").value;

    const eventType = document.getElementById("event-type").value;

    if (!title || !eventDate) {
        alert("Remplis le nom et la date.");
        return;
    }

    const button = document.getElementById("save-event-button");

    button.disabled = true;
    button.textContent = "Ajout...";

    try {

        const { error } = await db
            .from("events")
            .insert({
                class_id: currentClass.id,
                user_id: currentUser.id,
                title: title,
                description: description,
                event_date: eventDate,
                event_type: eventType
            });

        if (error) {
            throw error;
        }

        document.getElementById("event-form").classList.add("hidden");

        document.getElementById("event-title").value = "";
        document.getElementById("event-description").value = "";
        document.getElementById("event-date").value = "";
        document.getElementById("event-type").value = "other";

        await loadEvents();

    } catch (error) {

        console.error(error);

        alert(
            error.message || "Impossible d'ajouter l'événement."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Ajouter";
    }
});


// ==========================================
// CHARGEMENT DES DONNÉES
// ==========================================

async function loadAllData() {

    await Promise.all([
        loadCourses(),
        loadHomework(),
        loadEvents()
    ]);
}


// ==========================================
// CHARGER LES COURS
// ==========================================

async function loadCourses() {

    if (!currentClass) {
        return;
    }

    try {

        const { data, error } = await db
            .from("courses")
            .select("*")
            .eq("class_id", currentClass.id)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        renderCourses(data || []);

    } catch (error) {

        console.error("Erreur cours :", error);
    }
}


// ==========================================
// AFFICHER LES COURS
// ==========================================

function renderCourses(courses) {

    const list = document.getElementById("courses-list");

    if (!courses.length) {

        list.innerHTML = `
            <div class="empty-state">
                Aucun cours pour le moment.
            </div>
        `;

        document.getElementById("dashboard-course-count").textContent = "0";

        document.getElementById("dashboard-course-list").innerHTML = `
            <div class="empty-state">
                Aucun cours pour le moment.
            </div>
        `;

        return;
    }

    document.getElementById("dashboard-course-count").textContent =
        courses.length;

    list.innerHTML = courses.map(course => {

        return `
            <div class="item-card">

                <div class="item-top">

                    <div>

                        <div class="item-subject">
                            ${escapeHTML(course.subject)}
                        </div>

                        <h3>
                            ${escapeHTML(course.title)}
                        </h3>

                    </div>

                    <div class="item-date">
                        ${formatDate(course.created_at?.slice(0, 10))}
                    </div>

                </div>

                <div class="item-content">
                    ${escapeHTML(course.content)}
                </div>

            </div>
        `;

    }).join("");

    const recentCourses = courses.slice(0, 3);

    document.getElementById("dashboard-course-list").innerHTML =
        recentCourses.map(course => {

            return `
                <div class="item-card">

                    <div class="item-subject">
                        ${escapeHTML(course.subject)}
                    </div>

                    <h3>
                        ${escapeHTML(course.title)}
                    </h3>

                </div>
            `;

        }).join("");
}


// ==========================================
// CHARGER LES DEVOIRS
// ==========================================

async function loadHomework() {

    if (!currentClass) {
        return;
    }

    try {

        const { data, error } = await db
            .from("homework")
            .select("*")
            .eq("class_id", currentClass.id)
            .order("due_date", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        renderHomework(data || []);

    } catch (error) {

        console.error("Erreur devoirs :", error);
    }
}


// ==========================================
// AFFICHER LES DEVOIRS
// ==========================================

function renderHomework(homework) {

    const list = document.getElementById("homework-list");

    if (!homework.length) {

        list.innerHTML = `
            <div class="empty-state">
                Aucun devoir pour le moment.
            </div>
        `;

        document.getElementById("dashboard-homework-count").textContent = "0";

        document.getElementById("dashboard-homework-list").innerHTML = `
            <div class="empty-state">
                Aucun devoir pour le moment.
            </div>
        `;

        return;
    }

    document.getElementById("dashboard-homework-count").textContent =
        homework.length;

    list.innerHTML = homework.map(item => {

        return `
            <div class="item-card">

                <div class="item-top">

                    <div>

                        <div class="item-subject">
                            ${escapeHTML(item.subject)}
                        </div>

                        <h3>
                            ${escapeHTML(item.title)}
                        </h3>

                    </div>

                    <div class="item-date">
                        ${formatDate(item.due_date)}
                    </div>

                </div>

                ${
                    item.description
                        ? `
                            <div class="item-content">
                                ${escapeHTML(item.description)}
                            </div>
                        `
                        : ""
                }

            </div>
        `;

    }).join("");

    const upcoming = homework.slice(0, 3);

    document.getElementById("dashboard-homework-list").innerHTML =
        upcoming.map(item => {

            return `
                <div class="item-card">

                    <div class="item-top">

                        <div>

                            <div class="item-subject">
                                ${escapeHTML(item.subject)}
                            </div>

                            <h3>
                                ${escapeHTML(item.title)}
                            </h3>

                        </div>

                        <div class="item-date">
                            ${formatDate(item.due_date)}
                        </div>

                    </div>

                </div>
            `;

        }).join("");
}


// ==========================================
// CHARGER LES ÉVÉNEMENTS
// ==========================================

async function loadEvents() {

    if (!currentClass) {
        return;
    }

    try {

        const { data, error } = await db
            .from("events")
            .select("*")
            .eq("class_id", currentClass.id)
            .order("event_date", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        renderEvents(data || []);

    } catch (error) {

        console.error("Erreur événements :", error);
    }
}


// ==========================================
// AFFICHER LES ÉVÉNEMENTS
// ==========================================

function renderEvents(events) {

    const list = document.getElementById("events-list");

    if (!events.length) {

        list.innerHTML = `
            <div class="empty-state">
                Aucun événement pour le moment.
            </div>
        `;

        document.getElementById("dashboard-event-count").textContent = "0";

        return;
    }

    document.getElementById("dashboard-event-count").textContent =
        events.length;

    list.innerHTML = events.map(event => {

        return `
            <div class="item-card">

                <div class="item-top">

                    <div>

                        <div class="item-subject">
                            ${escapeHTML(event.event_type)}
                        </div>

                        <h3>
                            ${escapeHTML(event.title)}
                        </h3>

                    </div>

                    <div class="item-date">
                        ${formatDate(event.event_date)}
                    </div>

                </div>

                ${
                    event.description
                        ? `
                            <div class="item-content">
                                ${escapeHTML(event.description)}
                            </div>
                        `
                        : ""
                }

            </div>
        `;

    }).join("");
}


// ==========================================
// INITIALISATION
// ==========================================

async function init() {

    clearErrors();

    try {

        const {
            data: {
                session
            }
        } = await db.auth.getSession();

        if (session?.user) {

            currentUser = session.user;

            await loadUserClass();

        } else {

            showScreen(authScreen);
        }

    } catch (error) {

        console.error(error);

        showScreen(authScreen);
    }
}


// ==========================================
// SURVEILLER L'AUTHENTIFICATION
// ==========================================

db.auth.onAuthStateChange(async (event, session) => {

    if (session?.user) {

        currentUser = session.user;

    } else if (event === "SIGNED_OUT") {

        currentUser = null;
        currentClass = null;

        showScreen(authScreen);
    }
});


// ==========================================
// LANCEMENT
// ==========================================

init();
