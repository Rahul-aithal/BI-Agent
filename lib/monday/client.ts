const MONDAY_API_URL =
  process.env.MONDAY_API_URL ?? "https://api.monday.com/v2";

export interface MondayColumnValue {
  id: string;
  text: string | null;
  value: string | null;
  column?: {
    title: string;
    type: string;
  };
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

export interface MondayBoardSchema {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

export class MondayClient {
  private readonly token: string;

  private readonly schemaCache = new Map<string, MondayBoardSchema>();

  constructor(token: string) {
    if (!token) {
      throw new Error("MONDAY_API_TOKEN is required.");
    }

    this.token = token;
  }

  private async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(MONDAY_API_URL, {
      method: "POST",

      cache: "no-store",

      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
        "API-Version": "2024-10",
      },

      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Monday API returned ${response.status}\n${await response.text()}`,
      );
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: {
        message: string;
      }[];
    };

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join("\n"));
    }

    if (!json.data) {
      throw new Error("No data returned from Monday API.");
    }

    return json.data;
  }

  /**
   * Returns board metadata.
   * Cached because schemas rarely change.
   */
  async getBoardSchema(boardId: string): Promise<MondayBoardSchema> {
    const cached = this.schemaCache.get(boardId);

    if (cached) {
      return cached;
    }

    const query = `
      query ($boardId: [ID!]) {
        boards(ids: $boardId) {
          id
          name

          columns {
            id
            title
            type
          }
        }
      }
    `;

    const data = await this.graphql<{
      boards: MondayBoardSchema[];
    }>(query, {
      boardId: [boardId],
    });

    if (!data.boards.length) {
      throw new Error(`Board ${boardId} not found.`);
    }

    const schema = data.boards[0];

    this.schemaCache.set(boardId, schema);

    return schema;
  }

  /**
   * Fetch every item from a board.
   * Automatically follows pagination.
   */
  async getAllItems(boardId: string): Promise<MondayItem[]> {
    const items: MondayItem[] = [];

    let cursor: string | null = null;

    do {
      if (cursor) {
        const query = `
          query ($cursor: String!) {
            next_items_page(
              cursor: $cursor
              limit: 500
            ) {
              cursor

              items {
                id
                name

                column_values {
                  id
                  text
                  value

                  column {
                    title
                    type
                  }
                }
              }
            }
          }
        `;

        const data = await this.graphql<{
          next_items_page: {
            cursor: string | null;
            items: MondayItem[];
          };
        }>(query, {
          cursor,
        });

        items.push(...data.next_items_page.items);

        cursor = data.next_items_page.cursor;
      } else {
        const query = `
          query ($boardId: [ID!]) {
            boards(ids: $boardId) {
              items_page(limit: 500) {
                cursor

                items {
                  id
                  name

                  column_values {
                    id
                    text
                    value

                    column {
                      title
                      type
                    }
                  }
                }
              }
            }
          }
        `;

        const data = await this.graphql<{
          boards: Array<{
            items_page: {
              cursor: string | null;
              items: MondayItem[];
            };
          }>;
        }>(query, {
          boardId: [boardId],
        });

        const page = data.boards[0].items_page;

        items.push(...page.items);

        cursor = page.cursor;
      }
    } while (cursor);

    return items;
  }
}
