const taskForm = document.getElementById("task-form")
const taskInput = document.getElementById("task-input")
const taskList = document.getElementById("task-list")

const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000/tasks"
    : "https://tu-backend-en-render.onrender.com/tasks";

const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme");
let currentFilter = localStorage.getItem("activeFilter" || "all");
let lastAddedTaskId = null;


async function getTasks() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.status}`);
        }

        const tasks = await response.json();

        const filteredTasks = tasks.filter(task => {
            if (currentFilter === "pending") return !task.completed;
            if (currentFilter === "completed") return task.completed;
            return true;
        });

        const pendingCount = tasks.filter(task => !task.completed).length;
        document.getElementById("task-counter").textContent = `Pendientes: ${pendingCount}`;

        taskList.innerHTML = "";
        for (const task of filteredTasks) {
            const li = document.createElement("li");

            if (task.completed) {
                li.classList.add("completed");
            }

            if (lastAddedTaskId !== null && Number(task.id) === Number(lastAddedTaskId)) {
                li.classList.add("aparecer");
                lastAddedTaskId = null; 
            }

            li.innerHTML = `
                <span class="task-title">${task.title}</span>
                <div class="task-buttons">
                    <button class="btn-complete">${task.completed ? "Desmarcar" : "Completar"}</button>
                    <button class="btn-edit">Editar</button>
                    <button class="btn-delete">Eliminar</button>
                </div>
            `;

            li.querySelector(".btn-complete").onclick = () => toggleTask(task.id);
            li.querySelector(".btn-edit").onclick = () => enableEditMode(li, task);
            li.querySelector(".btn-delete").onclick = (e) => deleteTask(task.id, e);

            taskList.appendChild(li);
        }
    } catch (error) {
        console.error("Ocurrió un error al obtener las tareas:", error);
        taskList.innerHTML = `<li class="error-msg" style="color: #dc2626; text-align: center; border: none;">No se pudieron cargar las tareas. Intenta más tarde.</li>`;
    }
}


const filterButtons = document.querySelectorAll(".btn-filter");

filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const activeFilter = btn.getAttribute("data-filter");
        
        currentFilter = activeFilter;
        localStorage.setItem("activeFilter", currentFilter);
        
        updateFilterButtons();
        getTasks();
    });
});

async function toggleTask(id) {
    await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        "Content-Type": "application/json"
    })
    getTasks();
}

function enableEditMode(li, task) {
    const titleSpan = li.querySelector(".task-title");
    const buttonsDiv = li.querySelector(".task-buttons");

    titleSpan.innerHTML = `
        <input type="text" class="edit-input" value="${task.title}" />
    `;

    buttonsDiv.innerHTML = `
        <button class="btn-save">Guardar</button>
        <button class="btn-cancel">Cancelar</button>
    `;

    const input = titleSpan.querySelector(".edit-input");
    input.focus();

    buttonsDiv.querySelector(".btn-save").onclick = () => saveTaskEdit(task.id, input.value);
    input.onkeydown = (e) => {
        if (e.key === "Enter") saveTaskEdit(task.id, input.value);
        if (e.key === "Escape") getTasks(); // Cancela con la tecla Esc
    };

    buttonsDiv.querySelector(".btn-cancel").onclick = () => getTasks();
}

async function saveTaskEdit(id, newTitle) {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title: trimmedTitle })
        });

        if (response.ok) {
            getTasks();
        } else {
            console.error("Error al actualizar la tarea");
        }
    } catch (error) {
        console.error("Error de red al actualizar:", error);
    }
}

async function deleteTask(id, event) {
    const liElement = event.target.closest("li");
    liElement.classList.add("desaparecer");

    setTimeout(async () => {
        await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        });

    getTasks();
    }, 300)
}

taskForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const textoIngresado = taskInput.value.trim();
    if (!textoIngresado) return;

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: textoIngresado })
    });

    const newTask = await response.json();
    lastAddedTaskId = newTask.id;

    taskInput.value = "";
    getTasks();
});

function updateFilterButtons() {
    filterButtons.forEach(btn => {
        if (btn.getAttribute("data-filter") === currentFilter) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
    const isDarkMode = document.body.classList.toggle("dark-mode");

    if (isDarkMode) {
        localStorage.setItem("theme", "dark");
        themeToggle.textContent = "☀️";
    } else {
        localStorage.setItem("theme", "light");
        themeToggle.textContent = "🌙";
    }
});

updateFilterButtons();
getTasks();