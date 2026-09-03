// ==========================================
// SKOOL — JAVASCRIPT V2
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
let currentClassRole = "member";

let editingCourseId = null;
let editingHomeworkId = null;
let editingEventId = null;


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

function isAdmin() {
    return currentClassRole === "admin";
}

function canModifyItem(item) {
    return (
        currentUser &&
        (
            item.user_id === currentUser.id ||
            isAdmin()
        )
    );
}


// ==========================================
// AFFICHER LES FORMULAIRES
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
// CHARGER LA CLASSE
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

            currentClass = null;
            currentClassRole = "member";

            showScreen(classScreen);
            return;
        }

        currentClass = classData;

        const { data: roleData, error: roleError } = await db
            .rpc("get_my_class_role");

        if (roleError) {
            throw roleError;
        }

        currentClassRole = roleData || "member";

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

        currentClass = Array.isArray(data) ? data[0] : data;

        if (!currentClass || !currentClass.id) {
            throw new Error("La classe n'a pas pu être récupérée.");
        }

        currentClassRole = "admin";

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

        currentClassRole = "member";

        document.getElementById("join-class-code").value = "";

        await openMainApp();

    } catch (error) {

        console.error(error);

        setError(
            "class-error",
            error.message ||
            "Code incorrect ou impossible de rejoindre la classe."
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

    addClassControls();

    await loadAllData();
}


// ==========================================
// CONTRÔLES DE LA CLASSE
// ==========================================

function addClassControls() {

    const logoutButton = document.getElementById("logout-button");

    if (!logoutButton) {
        return;
    }

    // Évite les doublons
    const oldButton = document.getElementById("leave-class-button");

    if (oldButton) {
        oldButton.remove();
    }

    const leaveButton = document.createElement("button");

    leaveButton.id = "leave-class-button";
    leaveButton.type = "button";
    leaveButton.textContent = "Quitter la classe";

    // Même style de base que les autres boutons
    leaveButton.className = logoutButton.className;

    leaveButton.addEventListener("click", leaveClass);

    // Place le bouton juste avant Déconnexion
    logoutButton.parentNode.insertBefore(
        leaveButton,
        logoutButton
    );
}

// ==========================================
// QUITTER LA CLASSE
// ==========================================

async function leaveClass() {

    if (!currentClass) {
        return;
    }

    const confirmation = confirm(
        isAdmin()
            ? "Tu es administrateur. Si tu quittes cette classe, un autre membre deviendra automatiquement administrateur. Continuer ?"
            : "Veux-tu vraiment quitter cette classe ?"
    );

    if (!confirmation) {
        return;
    }

    try {

        const { error } = await db.rpc("leave_class");

        if (error) {
            throw error;
        }

        currentClass = null;
        currentClassRole = "member";

        showScreen(classScreen);

        const controls = document.getElementById("skool-class-controls");

        if (controls) {
            controls.remove();
        }

    } catch (error) {

        console.error(error);

        alert(
            error.message || "Impossible de quitter la classe."
        );
    }
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
// DÉCONNEXION DU COMPTE
// ==========================================

document.getElementById("logout-button").addEventListener("click", async () => {

    try {

        await db.auth.signOut();

    } catch (error) {

        console.error(error);
    }

    currentUser = null;
    currentClass = null;
    currentClassRole = "member";

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

    editingCourseId = null;

    document.getElementById("course-form").classList.remove("hidden");

    document.getElementById("save-course-button").textContent =
        "Ajouter le cours";
});


document.getElementById("cancel-course-button").addEventListener("click", () => {

    resetCourseForm();
});


function resetCourseForm() {

    editingCourseId = null;

    document.getElementById("course-form").classList.add("hidden");

    document.getElementById("course-subject").value = "";
    document.getElementById("course-title").value = "";
    document.getElementById("course-content").value = "";

    document.getElementById("save-course-button").textContent =
        "Ajouter le cours";
}


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
    button.textContent = editingCourseId
        ? "Modification..."
        : "Ajout...";

    try {

        let error;

        if (editingCourseId) {

            const result = await db
                .from("courses")
                .update({
                    subject: subject,
                    title: title,
                    content: content
                })
                .eq("id", editingCourseId)
                .eq("class_id", currentClass.id);

            error = result.error;

        } else {

            const result = await db
                .from("courses")
                .insert({
                    class_id: currentClass.id,
                    user_id: currentUser.id,
                    subject: subject,
                    title: title,
                    content: content
                });

            error = result.error;
        }

        if (error) {
            throw error;
        }

        resetCourseForm();

        await loadCourses();

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Impossible d'enregistrer le cours."
        );

    } finally {

        button.disabled = false;

        if (!editingCourseId) {
            button.textContent = "Ajouter le cours";
        }
    }
});


// ==========================================
// MODIFIER UN COURS
// ==========================================

function editCourse(course) {

    if (!canModifyItem(course)) {
        return;
    }

    editingCourseId = course.id;

    document.getElementById("course-subject").value =
        course.subject || "";

    document.getElementById("course-title").value =
        course.title || "";

    document.getElementById("course-content").value =
        course.content || "";

    document.getElementById("course-form").classList.remove("hidden");

    document.getElementById("save-course-button").textContent =
        "Enregistrer les modifications";

    document.getElementById("course-form").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ==========================================
// SUPPRIMER UN COURS
// ==========================================

async function deleteCourse(course) {

    if (!canModifyItem(course)) {
        return;
    }

    if (!confirm(`Supprimer le cours "${course.title}" ?`)) {
        return;
    }

    try {

        const { error } = await db
            .from("courses")
            .delete()
            .eq("id", course.id)
            .eq("class_id", currentClass.id);

        if (error) {
            throw error;
        }

        await loadCourses();

    } catch (error) {

        console.error(error);

        alert(
            error.message || "Impossible de supprimer le cours."
        );
    }
}


// ==========================================
// DEVOIRS
// ==========================================

document.getElementById("add-homework-button").addEventListener("click", () => {

    editingHomeworkId = null;

    document.getElementById("homework-form").classList.remove("hidden");

    document.getElementById("save-homework-button").textContent =
        "Ajouter le devoir";
});


document.getElementById("cancel-homework-button").addEventListener("click", () => {

    resetHomeworkForm();
});


function resetHomeworkForm() {

    editingHomeworkId = null;

    document.getElementById("homework-form").classList.add("hidden");

    document.getElementById("homework-subject").value = "";
    document.getElementById("homework-title").value = "";
    document.getElementById("homework-description").value = "";
    document.getElementById("homework-date").value = "";

    document.getElementById("save-homework-button").textContent =
        "Ajouter le devoir";
}


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
    button.textContent = editingHomeworkId
        ? "Modification..."
        : "Ajout...";

    try {

        let error;

        if (editingHomeworkId) {

            const result = await db
                .from("homework")
                .update({
                    subject: subject,
                    title: title,
                    description: description,
                    due_date: dueDate
                })
                .eq("id", editingHomeworkId)
                .eq("class_id", currentClass.id);

            error = result.error;

        } else {

            const result = await db
                .from("homework")
                .insert({
                    class_id: currentClass.id,
                    user_id: currentUser.id,
                    subject: subject,
                    title: title,
                    description: description,
                    due_date: dueDate
                });

            error = result.error;
        }

        if (error) {
            throw error;
        }

        resetHomeworkForm();

        await loadHomework();

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Impossible d'enregistrer le devoir."
        );

    } finally {

        button.disabled = false;
    }
});


// ==========================================
// MODIFIER UN DEVOIR
// ==========================================

function editHomework(item) {

    if (!canModifyItem(item)) {
        return;
    }

    editingHomeworkId = item.id;

    document.getElementById("homework-subject").value =
        item.subject || "";

    document.getElementById("homework-title").value =
        item.title || "";

    document.getElementById("homework-description").value =
        item.description || "";

    document.getElementById("homework-date").value =
        item.due_date || "";

    document.getElementById("homework-form").classList.remove("hidden");

    document.getElementById("save-homework-button").textContent =
        "Enregistrer les modifications";

    document.getElementById("homework-form").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ==========================================
// SUPPRIMER UN DEVOIR
// ==========================================

async function deleteHomework(item) {

    if (!canModifyItem(item)) {
        return;
    }

    if (!confirm(`Supprimer le devoir "${item.title}" ?`)) {
        return;
    }

    try {

        const { error } = await db
            .from("homework")
            .delete()
            .eq("id", item.id)
            .eq("class_id", currentClass.id);

        if (error) {
            throw error;
        }

        await loadHomework();

    } catch (error) {

        console.error(error);

        alert(
            error.message || "Impossible de supprimer le devoir."
        );
    }
}


// ==========================================
// ÉVÉNEMENTS
// ==========================================

document.getElementById("add-event-button").addEventListener("click", () => {

    editingEventId = null;

    document.getElementById("event-form").classList.remove("hidden");

    document.getElementById("save-event-button").textContent =
        "Ajouter";
});


document.getElementById("cancel-event-button").addEventListener("click", () => {

    resetEventForm();
});


function resetEventForm() {

    editingEventId = null;

    document.getElementById("event-form").classList.add("hidden");

    document.getElementById("event-title").value = "";
    document.getElementById("event-description").value = "";
    document.getElementById("event-date").value = "";
    document.getElementById("event-type").value = "other";

    document.getElementById("save-event-button").textContent =
        "Ajouter";
}


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
    button.textContent = editingEventId
        ? "Modification..."
        : "Ajout...";

    try {

        let error;

        if (editingEventId) {

            const result = await db
                .from("events")
                .update({
                    title: title,
                    description: description,
                    event_date: eventDate,
                    event_type: eventType
                })
                .eq("id", editingEventId)
                .eq("class_id", currentClass.id);

            error = result.error;

        } else {

            const result = await db
                .from("events")
                .insert({
                    class_id: currentClass.id,
                    user_id: currentUser.id,
                    title: title,
                    description: description,
                    event_date: eventDate,
                    event_type: eventType
                });

            error = result.error;
        }

        if (error) {
            throw error;
        }

        resetEventForm();

        await loadEvents();

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Impossible d'enregistrer l'événement."
        );

    } finally {

        button.disabled = false;
    }
});


// ==========================================
// MODIFIER UN ÉVÉNEMENT
// ==========================================

function editEvent(event) {

    if (!canModifyItem(event)) {
        return;
    }

    editingEventId = event.id;

    document.getElementById("event-title").value =
        event.title || "";

    document.getElementById("event-description").value =
        event.description || "";

    document.getElementById("event-date").value =
        event.event_date || "";

    document.getElementById("event-type").value =
        event.event_type || "other";

    document.getElementById("event-form").classList.remove("hidden");

    document.getElementById("save-event-button").textContent =
        "Enregistrer les modifications";

    document.getElementById("event-form").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ==========================================
// SUPPRIMER UN ÉVÉNEMENT
// ==========================================

async function deleteEvent(event) {

    if (!canModifyItem(event)) {
        return;
    }

    if (!confirm(`Supprimer l'événement "${event.title}" ?`)) {
        return;
    }

    try {

        const { error } = await db
            .from("events")
            .delete()
            .eq("id", event.id)
            .eq("class_id", currentClass.id);

        if (error) {
            throw error;
        }

        await loadEvents();

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Impossible de supprimer l'événement."
        );
    }
}


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

        const actions = canModifyItem(course)
            ? `
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button
                        type="button"
                        class="small-button"
                        data-action="edit-course"
                        data-id="${escapeHTML(course.id)}">
                        Modifier
                    </button>

                    <button
                        type="button"
                        class="small-button"
                        data-action="delete-course"
                        data-id="${escapeHTML(course.id)}">
                        Supprimer
                    </button>
                </div>
            `
            : "";

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

                ${actions}

            </div>
        `;

    }).join("");

    list.querySelectorAll('[data-action="edit-course"]').forEach(button => {

        button.addEventListener("click", () => {

            const course = courses.find(
                item => item.id === button.dataset.id
            );

            if (course) {
                editCourse(course);
            }
        });
    });

    list.querySelectorAll('[data-action="delete-course"]').forEach(button => {

        button.addEventListener("click", () => {

            const course = courses.find(
                item => item.id === button.dataset.id
            );

            if (course) {
                deleteCourse(course);
            }
        });
    });

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

        const actions = canModifyItem(item)
            ? `
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button
                        type="button"
                        class="small-button"
                        data-action="edit-homework"
                        data-id="${escapeHTML(item.id)}">
                        Modifier
                    </button>

                    <button
                        type="button"
                        class="small-button"
                        data-action="delete-homework"
                        data-id="${escapeHTML(item.id)}">
                        Supprimer
                    </button>
                </div>
            `
            : "";

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

                ${actions}

            </div>
        `;

    }).join("");

    list.querySelectorAll('[data-action="edit-homework"]').forEach(button => {

        button.addEventListener("click", () => {

            const item = homework.find(
                homeworkItem => homeworkItem.id === button.dataset.id
            );

            if (item) {
                editHomework(item);
            }
        });
    });

    list.querySelectorAll('[data-action="delete-homework"]').forEach(button => {

        button.addEventListener("click", () => {

            const item = homework.find(
                homeworkItem => homeworkItem.id === button.dataset.id
            );

            if (item) {
                deleteHomework(item);
            }
        });
    });

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

        const actions = canModifyItem(event)
            ? `
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button
                        type="button"
                        class="small-button"
                        data-action="edit-event"
                        data-id="${escapeHTML(event.id)}">
                        Modifier
                    </button>

                    <button
                        type="button"
                        class="small-button"
                        data-action="delete-event"
                        data-id="${escapeHTML(event.id)}">
                        Supprimer
                    </button>
                </div>
            `
            : "";

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

                ${actions}

            </div>
        `;

    }).join("");

    list.querySelectorAll('[data-action="edit-event"]').forEach(button => {

        button.addEventListener("click", () => {

            const event = events.find(
                item => item.id === button.dataset.id
            );

            if (event) {
                editEvent(event);
            }
        });
    });

    list.querySelectorAll('[data-action="delete-event"]').forEach(button => {

        button.addEventListener("click", () => {

            const event = events.find(
                item => item.id === button.dataset.id
            );

            if (event) {
                deleteEvent(event);
            }
        });
    });
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
        currentClassRole = "member";

        showScreen(authScreen);
    }
});


// ==========================================
// LANCEMENT
// ==========================================

init();
