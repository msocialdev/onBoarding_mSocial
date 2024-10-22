class DraggableTimeline {
    constructor(container, options) {
        this.container = document.querySelector(container);
        this.tasks = options.tasks || [];
        this.colors = options.colors || [];
        this.startTime = options.startTime || new Date();
        this.endTime = options.endTime || new Date(this.startTime.getTime() + 7 * 24 * 60 * 60 * 1000);  // Default to 7 days later

        this.onDragStart = options.onDragStart || function() {};
        this.onDragEnd = options.onDragEnd || function() {};
        this.onResizeStart = options.onResizeStart || function() {};
        this.onResizeEnd = options.onResizeEnd || function() {};

        this.render();
    }

    render() {
        // Clear container and setup layout
        this.container.innerHTML = '';
        this.container.classList.add('timeline-wrapper');

        // Create timeline header
        const header = this.createTimelineHeader();
        this.container.appendChild(header);

        // Create main timeline container
        const timelineContainer = document.createElement('div');
        timelineContainer.classList.add('timeline-main');
        this.container.appendChild(timelineContainer);

        // Render the grid lines
        this.renderGridLines(timelineContainer);

        // Render the tasks and subtasks
        this.tasks.forEach((task, index) => {
            this.renderTask(timelineContainer, task, index);
            if (task.subtasks) {
                task.subtasks.forEach((subtask, subIndex) => {
                    this.renderSubtask(timelineContainer, subtask, index, subIndex);
                });
            }
        });
    }

    createTimelineHeader() {
        const header = document.createElement('div');
        header.classList.add('timeline-header');

        // Generate date range based on start and end times
        const totalDays = Math.ceil((this.endTime - this.startTime) / (24 * 60 * 60 * 1000));
        const dayWidth = (100 / totalDays);
        console.log(dayWidth);

        for (let i = 0; i < totalDays; i++) {
            const dayLabel = document.createElement('div');
            dayLabel.classList.add('timeline-date');
            const date = new Date(this.startTime.getTime() + i * 24 * 60 * 60 * 1000);
            dayLabel.innerText = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            dayLabel.style.width = `${dayWidth}%`;
            header.appendChild(dayLabel);
        }
        return header;
    }

    renderGridLines(timelineContainer) {
        const gridLinesContainer = document.createElement('div');
        gridLinesContainer.classList.add('grid-lines');
        timelineContainer.appendChild(gridLinesContainer);

        const totalDays = Math.ceil((this.endTime - this.startTime) / (24 * 60 * 60 * 1000));
        const dayWidth = (100 / totalDays);
        console.log(dayWidth);

        // Create dark grid lines for each day
        for (let i = 0; i < totalDays; i++) {
            const gridLine = document.createElement('div');
            gridLine.classList.add('grid-line', 'day-grid');
            gridLine.style.left = `${i * dayWidth}%`;
            gridLinesContainer.appendChild(gridLine);
        }

        // Create light grid lines for each hour
        for (let day = 0; day < totalDays; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const hourLine = document.createElement('div');
                hourLine.classList.add('grid-line', 'hour-grid');
                hourLine.style.left = `${day * dayWidth + (hour / 24) * dayWidth}%`;
                gridLinesContainer.appendChild(hourLine);
            }
        }
    }

    renderTask(timelineContainer, task, index) {
        // Create a row for the main task
        const taskRow = document.createElement('div');
        taskRow.classList.add('timeline-task-row');
        timelineContainer.appendChild(taskRow);

        // Render main task bar
        this.renderBar(taskRow, task, index);
    }

    renderSubtask(timelineContainer, subtask, parentIndex, subIndex) {
        // Create a row for the subtask
        const subtaskRow = document.createElement('div');
        subtaskRow.classList.add('timeline-task-row');
        timelineContainer.appendChild(subtaskRow);

        // Render subtask bar
        this.renderBar(subtaskRow, subtask, `${parentIndex}-${subIndex}`, true);
    }

    renderBar(container, task, index, isSubtask = false) {
        const bar = document.createElement('div');
        bar.classList.add('timeline-bar');
        bar.style.backgroundColor = isSubtask ? '#FF5722' : '#4CAF50';
        bar.innerText = task.label;
        bar.title = `Title: ${task.label}\nStart: ${task.start.toLocaleString()}\nEnd: ${task.end.toLocaleString()}\nDeadline: ${task.deadline ? task.deadline.toLocaleString() : 'N/A'}`;
        let deadline;
        if(task.deadline)
        {
            deadline = document.createElement('div');
            deadline.classList.add('deadline-bar');
            deadline.innerText = "Deadline";
        }

        const totalTimelineWidth = container.parentNode.clientWidth;
        const timelineStart = this.startTime.getTime();
        const timelineEnd = this.endTime.getTime();

        // Convert task start and end to percentages
        const barStartPercent = ((task.start.getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100;
        const barEndPercent = ((task.end.getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100;
        if(task.deadline)
        {
            const deadlineStartPercent = ((task.deadline.getTime() - timelineStart) / (timelineEnd - timelineStart)) * 100;
            deadline.style.left = `${deadlineStartPercent}%`;
            deadline.style.width = "100%";
            container.appendChild(deadline);
        }
        bar.style.left = `${barStartPercent}%`;
        bar.style.width = `${barEndPercent - barStartPercent}%`;

        // Add visual drag indicators
        const dragStartHandle = document.createElement('div');
        dragStartHandle.classList.add('drag-handle', 'drag-handle-start');
        bar.appendChild(dragStartHandle);

        const dragEndHandle = document.createElement('div');
        dragEndHandle.classList.add('drag-handle', 'drag-handle-end');
        bar.appendChild(dragEndHandle);

        container.appendChild(bar);

        this.makeDraggable(bar, task, index, isSubtask);
    }

    makeDraggable(bar, task, index, isSubtask) {
        const minLimit = this.startTime.getTime();
        const maxLimit = this.endTime.getTime();

        interact(bar)
            .draggable({
                onstart: (event) => {
                    this.onDragStart(event, task, index);
                },
                onmove: (event) => {
                    const target = event.target;
                    const totalTimelineWidth = target.parentNode.clientWidth;

                    const x = parseFloat(target.getAttribute('data-x')) || 0;
                    const deltaX = event.dx;

                    // Calculate new position
                    const newX = x + deltaX;
                    target.style.transform = `translate(${newX}px, 0)`;
                    target.setAttribute('data-x', newX);
                },
                onend: (event) => {
                    const target = event.target;
                    const totalTimelineWidth = target.parentNode.clientWidth;
                    const x = parseFloat(target.getAttribute('data-x')) || 0;

                    // Convert pixel change to time change
                    const timeDelta = ((x / totalTimelineWidth) * (this.endTime - this.startTime));
                    const newStartTime = task.start.getTime() + timeDelta;
                    const newEndTime = task.end.getTime() + timeDelta;

                    if (newStartTime >= minLimit && newEndTime <= maxLimit) {
                    task.start = new Date(newStartTime);
                    task.end = new Date(newEndTime);
                    }

                    target.style.transform = 'translate(0, 0)';  // Reset translation
                    target.setAttribute('data-x', 0);
                    this.onDragEnd(event, task, index);
                    this.render();  // Re-render after updating task data
                }
            })
            .resizable({
                edges: { left: true, right: true },
                onstart: (event) => {
                    this.onResizeStart(event, task, index);
                },
                onmove: (event) => {
                    const target = event.target;
                    const x = parseFloat(target.getAttribute('data-x')) || 0;
                    const width = parseFloat(target.clientWidth) || 0;

                    // Determine if resizing from left or right
                    const isResizingFromLeft = event.deltaRect.left !== 0;
                    const isResizingFromRight = event.deltaRect.right !== 0;

                    let newWidth = width;
                    let newX = x;

                    if (isResizingFromLeft) {
                        console.log("left")
                        newWidth = Math.max(0, width - event.deltaRect.left); // Prevent negative width
                        newX = x + event.deltaRect.left;    
                    } else if (isResizingFromRight) {
                        console.log("right")
                        newWidth = Math.max(0, width + event.deltaRect.right); // Prevent negative width
                    }

                    target.style.transform = `translate(${newX}px, 0)`;
                    target.style.width = `${newWidth}px`;
                    target.setAttribute('data-x', newX);
                },
                onend: (event) => {
                    const target = event.target;
                    const totalTimelineWidth = target.parentNode.clientWidth;
                    const x = parseFloat(target.getAttribute('data-x')) || 0;
                    const width = parseFloat(target.clientWidth) || 0;
                    const startDelta = (x / totalTimelineWidth) * (this.endTime - this.startTime);
                    const endDelta = (width / totalTimelineWidth) * (this.endTime - this.startTime);

                    const newStartTime = task.start.getTime() + startDelta;
                    const newEndTime = newStartTime + endDelta;

                    if (newStartTime >= minLimit && newEndTime <= maxLimit) {
                        task.start = new Date(newStartTime);
                        task.end = new Date(newEndTime);
                    }

                    target.style.transform = 'translate(0, 0)';  // Reset translation
                    target.setAttribute('data-x', 0);
                    this.onResizeEnd(event, task, index);
                    this.render();  // Re-render after updating task data
                }
            });
    }

    addTask(task) {
        this.tasks.push(task);
        this.render();
    }

    updateTask(index, task) {
        this.tasks[index] = task;
        this.render();
    }

    setColor(index, color) {
        this.colors[index] = color;
        this.render();
    }
}
