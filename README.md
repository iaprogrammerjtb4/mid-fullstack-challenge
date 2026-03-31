## Technical Challenge — Mid-Level

### Background

A small project management startup wants to build a simple internal tool for their team to organize work visually. They need a basic task board where team members can create boards, organize tasks into columns, and move tasks between stages.

In this challenge, you'll build a simplified task board application with a REST API, a database, and a functional UI.

We are **not evaluating specific tools or patterns**. We simply want to understand how you think, how you code, and how you approach real-world problems. Be yourself.


### What You Need to Build

A functional **full stack application** with the ability to:

1. Create and view boards
2. Add columns to a board
3. Create, update, and delete tasks within columns
4. Move tasks between columns
5. View a board in a kanban-style layout


### Database Schema

Design the schema yourself. At minimum, you should support:

- **Boards** with a name and creation date
- **Columns** belonging to a board, with a name and display order
- **Tasks** belonging to a column, with: title, description, priority, and creation date

Include appropriate indexes and a seed script that creates one board with sample data.


### Tech Stack

#### Backend

* Runtime: **Bun**
* Framework: **Next.js** (App Router)
* Database: **SQLite** (ORM, query builder, or raw SQL — your choice)

#### Frontend

* Framework: **Next.js**
* Styling: **TailwindCSS**
* Additional UI libraries are welcome but not required


### Required API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board |
| GET | `/api/boards/:id` | Get a board with its columns and tasks |
| POST | `/api/columns` | Create a column (linked to a board) |
| POST | `/api/tasks` | Create a task (linked to a column) |
| PATCH | `/api/tasks/:id` | Update a task (title, description, move to another column) |
| DELETE | `/api/tasks/:id` | Delete a task |

- Validate input on every endpoint.
- Return proper HTTP status codes (400, 404, etc.).
- Use a consistent JSON response structure.


### Required UI

1. A page showing a board in **kanban-style layout** (columns side by side, tasks as cards)
2. Ability to **create a new task** via a modal or dialog
3. Ability to **move a task** between columns (a simple dropdown is fine, no drag-and-drop required)
4. Loading and empty states


### Submission Instructions

* **Fork this repository**, complete your work, and **submit a pull request**.
* Include a `README.md` with:
  * Clear instructions to run the project locally
  * A short explanation of your architecture or design decisions
  * A seed script to preload sample data


### Time Expectation

You should spend no more than **2 hours** on this task.

Don't worry if you can't finish everything. What matters most is **how far you get** and **how you approach the problem**.


### Evaluation & Guidance

What we mainly evaluate:

- Solution design and structure (architecture, modularity, separation of concerns).
- Clarity of reasoning and documentation (decisions, trade-offs, assumptions).
- Code quality (readability, consistency, error handling, good practices).
- API design (RESTful conventions, validation, error responses).
- UI completeness and usability.
- Git workflow (incremental commits with clear messages).
- Prioritization and scope management: it's valid to leave items pending if you explain what and why.

Use of AI (optional but allowed):

- You may use AI tools (e.g., Claude, Copilot, ChatGPT, Cursor) to assist with your solution.
- We care most about how you structure the solution and explain your decisions.
- If you used AI, add a brief note in your PR/README: which tools you used, which parts were assisted, and what changes you made after review.
- Only include code you understand and can justify.
