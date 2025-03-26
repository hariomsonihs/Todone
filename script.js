document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const clearAllBtn = document.getElementById('clear-all');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const priorityBtns = document.querySelectorAll('.priority-btn');
    const sortSelect = document.getElementById('sort-select');
    const tasksCount = document.getElementById('tasks-count');
    const completedCount = document.getElementById('completed-count');
    const themeBtn = document.getElementById('theme-btn');
    const modal = document.getElementById('task-modal');
    const closeModal = document.querySelector('.close-modal');
    const saveChangesBtn = document.getElementById('save-changes');
    const editTaskText = document.getElementById('edit-task-text');
    const editDueDate = document.getElementById('edit-due-date');
    const editNotes = document.getElementById('edit-notes');
    const priorityOptions = document.querySelectorAll('.priority-option');
    
    // State variables
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let currentPriorityFilter = 'all';
    let currentSort = 'date-added';
    let currentEditId = null;
    let currentPriority = 'medium';
    let isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Initialize the app
    function init() {
        renderTasks();
        updateStats();
        setTheme();
        
        // Set up event listeners
        addBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });
        
        clearCompletedBtn.addEventListener('click', clearCompletedTasks);
        clearAllBtn.addEventListener('click', clearAllTasks);
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderTasks();
            });
        });
        
        priorityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                priorityBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPriorityFilter = btn.dataset.priority;
                renderTasks();
            });
        });
        
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            renderTasks();
        });
        
        themeBtn.addEventListener('click', toggleTheme);
        
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        saveChangesBtn.addEventListener('click', saveTaskChanges);
        
        priorityOptions.forEach(option => {
            option.addEventListener('click', function() {
                priorityOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                currentPriority = this.dataset.priority;
            });
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Initialize drag and drop
        initDragAndDrop();
    }
    
    // Add a new task
    function addTask() {
        const text = taskInput.value.trim();
        if (text === '') return;
        
        const newTask = {
            id: Date.now(),
            text,
            completed: false,
            priority: 'medium',
            dueDate: '',
            notes: '',
            createdAt: new Date().toISOString()
        };
        
        tasks.unshift(newTask);
        saveTasks();
        renderTasks();
        updateStats();
        
        taskInput.value = '';
        taskInput.focus();
    }
    
    // Render tasks based on filters and sorting
    function renderTasks() {
        // Filter tasks
        let filteredTasks = [...tasks];
        
        if (currentFilter === 'active') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }
        
        if (currentPriorityFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === currentPriorityFilter);
        }
        
        // Sort tasks
        filteredTasks = sortTasks(filteredTasks);
        
        // Render
        taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<p class="no-tasks">No tasks found. Add a new task!</p>';
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.draggable = true;
            taskItem.dataset.id = task.id;
            
            // Drag and drop attributes
            taskItem.dataset.position = tasks.findIndex(t => t.id === task.id);
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
            
            const taskText = document.createElement('span');
            taskText.className = `task-text ${task.completed ? 'completed' : ''}`;
            taskText.textContent = task.text;
            
            const dueDate = document.createElement('span');
            dueDate.className = 'task-due-date';
            if (task.dueDate) {
                const formattedDate = formatDate(task.dueDate);
                dueDate.textContent = formattedDate;
                
                // Add warning if task is overdue
                const today = new Date();
                const due = new Date(task.dueDate);
                if (due < today && !task.completed) {
                    dueDate.style.color = 'var(--danger-color)';
                    dueDate.textContent = `${formattedDate} (Overdue)`;
                }
            }
            
            const priorityDot = document.createElement('span');
            priorityDot.className = `task-priority priority-${task.priority}`;
            
            const taskActions = document.createElement('div');
            taskActions.className = 'task-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.addEventListener('click', () => openEditModal(task.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
            
            taskActions.appendChild(editBtn);
            taskActions.appendChild(deleteBtn);
            
            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskText);
            if (task.dueDate) taskItem.appendChild(dueDate);
            taskItem.appendChild(priorityDot);
            taskItem.appendChild(taskActions);
            
            taskList.appendChild(taskItem);
        });
        
        // Reinitialize drag and drop after rendering
        initDragAndDrop();
    }
    
    // Sort tasks based on current sort option
    function sortTasks(tasksToSort) {
        switch (currentSort) {
            case 'date-added':
                return tasksToSort.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'due-date':
                return tasksToSort.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
            case 'priority':
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return tasksToSort.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            case 'alphabetical':
                return tasksToSort.sort((a, b) => a.text.localeCompare(b.text));
            default:
                return tasksToSort;
        }
    }
    
    // Toggle task completion status
    function toggleTaskComplete(id) {
        tasks = tasks.map(task => 
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        saveTasks();
        updateStats();
        
        // Update the task text style
        const taskText = document.querySelector(`.task-item[data-id="${id}"] .task-text`);
        if (taskText) {
            taskText.classList.toggle('completed');
        }
    }
    
    // Delete a single task
    function deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            tasks = tasks.filter(task => task.id !== id);
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    // Clear all completed tasks
    function clearCompletedTasks() {
        if (confirm('Are you sure you want to clear all completed tasks?')) {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    // Clear all tasks
    function clearAllTasks() {
        if (confirm('Are you sure you want to clear ALL tasks? This cannot be undone.')) {
            tasks = [];
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    // Open edit modal with task details
    function openEditModal(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        
        currentEditId = id;
        editTaskText.value = task.text;
        editDueDate.value = task.dueDate || '';
        editNotes.value = task.notes || '';
        
        // Set priority
        priorityOptions.forEach(opt => opt.classList.remove('active'));
        document.querySelector(`.priority-option.${task.priority}`).classList.add('active');
        currentPriority = task.priority;
        
        modal.style.display = 'block';
    }
    
    // Save changes from edit modal
    function saveTaskChanges() {
        const taskIndex = tasks.findIndex(t => t.id === currentEditId);
        if (taskIndex === -1) return;
        
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            text: editTaskText.value.trim(),
            dueDate: editDueDate.value,
            notes: editNotes.value.trim(),
            priority: currentPriority
        };
        
        saveTasks();
        renderTasks();
        modal.style.display = 'none';
    }
    
    // Update task statistics
    function updateStats() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        
        tasksCount.textContent = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'}`;
        completedCount.textContent = `${completedTasks} completed`;
    }
    
    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Toggle dark/light theme
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        setTheme();
        localStorage.setItem('darkMode', isDarkMode);
    }
    
    // Apply theme based on current mode
    function setTheme() {
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
    
    // Format date for display
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    // Initialize drag and drop functionality
    function initDragAndDrop() {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            item.addEventListener('dragstart', dragStart);
            item.addEventListener('dragover', dragOver);
            item.addEventListener('drop', drop);
            item.addEventListener('dragend', dragEnd);
        });
    }
    
    // Drag and drop event handlers
    function dragStart(e) {
        e.dataTransfer.setData('text/plain', this.dataset.id);
        this.classList.add('dragging');
        setTimeout(() => this.style.opacity = '0.4', 0);
    }
    
    function dragOver(e) {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const boundingBox = this.getBoundingClientRect();
        const offset = boundingBox.y + boundingBox.height / 2;
        
        if (e.clientY < offset) {
            this.style.borderTop = '2px solid var(--primary-color)';
            this.style.borderBottom = 'none';
        } else {
            this.style.borderBottom = '2px solid var(--primary-color)';
            this.style.borderTop = 'none';
        }
    }
    
    function drop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const draggedItem = document.querySelector(`.task-item[data-id="${id}"]`);
        const dropTarget = this;
        
        // Reset styles
        this.style.borderTop = 'none';
        this.style.borderBottom = 'none';
        
        // Don't do anything if dropped on itself
        if (draggedItem === dropTarget) return;
        
        // Get positions
        const draggedIndex = tasks.findIndex(task => task.id === parseInt(id));
        const dropIndex = tasks.findIndex(task => task.id === parseInt(dropTarget.dataset.id));
        
        // Determine new position based on drop position
        const boundingBox = dropTarget.getBoundingClientRect();
        const offset = boundingBox.y + boundingBox.height / 2;
        const newIndex = e.clientY < offset ? dropIndex : dropIndex + 1;
        
        // Move task in array
        if (draggedIndex < newIndex) {
            tasks.splice(newIndex, 0, tasks[draggedIndex]);
            tasks.splice(draggedIndex, 1);
        } else {
            tasks.splice(newIndex, 0, tasks[draggedIndex]);
            tasks.splice(draggedIndex + 1, 1);
        }
        
        saveTasks();
        renderTasks();
    }
    
    function dragEnd() {
        this.classList.remove('dragging');
        this.style.opacity = '1';
        this.style.borderTop = 'none';
        this.style.borderBottom = 'none';
    }
    
    // Initialize the app
    init();
    document.getElementById('current-year').textContent = new Date().getFullYear();
});