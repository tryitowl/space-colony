# Project Overview: Space Colony Trade

This project is a real-time, multi-user web application, likely a game or simulation focused on space colony trading. It features distinct user roles (e.g., players, facilitators, administrators) with dedicated dashboards and protected routes. The application is built with a modern web stack, emphasizing performance and a rich user experience.

## Technologies Used

*   **Frontend:** React (with Vite for fast development and bundling)
*   **Styling:** Tailwind CSS, PostCSS, Autoprefixer
*   **Animation:** Framer Motion
*   **Icons:** Lucide React
*   **Routing:** React Router DOM
*   **Backend & Database:** Firebase (Authentication, Firestore, Realtime Database, Functions, Analytics)
*   **Language:** TypeScript
*   **Testing:** Vitest, React Testing Library
*   **Linting:** ESLint

## Building and Running

The project uses `vite` for development and building.

*   **Development Mode:**
    ```bash
    npm run dev
    ```
    This will start the development server, typically accessible at `http://localhost:3000`.

*   **Building for Production:**
    ```bash
    npm run build
    ```
    This command compiles the application for production, outputting optimized assets to the `dist` directory.

*   **Running Tests:**
    ```bash
    npm test
    ```
    This launches the Vitest test runner. Additional test commands are available:
    *   `npm run test:ui`: Runs tests with a UI.
    *   `npm run test:coverage`: Runs tests and generates a coverage report.

*   **Linting:**
    ```bash
    npm run lint
    ```
    This command runs ESLint to check for code style and quality issues.

## Development Conventions

*   **Project Structure:** The application follows a component-based architecture with clear separation of concerns (pages, components, services, contexts, hooks, etc.).
*   **Path Aliases:** The `@` alias is configured to point to the `src` directory, simplifying imports (e.g., `import MyComponent from '@/components/MyComponent';`).
*   **Environment Variables:** Firebase configuration and other sensitive information are managed via environment variables (e.g., `VITE_FIREBASE_API_KEY`) which are validated at runtime.
*   **Code Splitting:** Pages are lazy-loaded using `React.lazy` and `Suspense` to improve initial load times. Vite's manual chunking further optimizes bundle sizes.
*   **Authentication & Authorization:** The application implements role-based access control using `ProtectedRoute` to restrict access to certain routes based on user roles (facilitator, admin).
*   **Styling:** Tailwind CSS is used for utility-first styling, promoting consistent and rapid UI development.
