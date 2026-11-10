/** Body of POST /users/me/activity/views. */
export interface ActivityViewRequestDto {
  kind: "WINE" | "ROUTE" | "EVENT" | "WINERY";
  id: string;
}
