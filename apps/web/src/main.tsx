import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import { createApolloClient } from "./apollo";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={createApolloClient()}>
      <App />
    </ApolloProvider>
  </StrictMode>,
);
