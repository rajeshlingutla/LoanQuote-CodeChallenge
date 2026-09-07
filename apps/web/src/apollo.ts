import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { API_KEY } from "./config";

export function createApolloClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: "/api/graphql",
      headers: {
        "x-api-key": API_KEY,
      },
    }),
  });
}
