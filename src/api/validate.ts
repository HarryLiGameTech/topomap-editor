const VALIDATE_URL = '/api/validate';

interface ValidateSuccess {
  status: 'success';
  message: string;
}

interface ValidateError {
  status: 'error';
  message: string;
}

type ValidateResponse = ValidateSuccess | ValidateError;

/**
 * Sends the DSL files to the Spring Boot /validate endpoint.
 * Always resolves (never throws) — the returned object carries the status.
 */
export async function sendValidate(dsl: string): Promise<ValidateResponse> {
  const body: Record<string, string> = {
    configuration: 'building-includes{\n    submap ExampleMap\n}',
    ExampleMap: dsl,
  };

  try {
    const res = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Guard against non-JSON responses (e.g. Vite 404 page when backend is off)
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return { status: 'error', message: `Server returned HTTP ${res.status} (backend may be offline)` };
    }

    const data = (await res.json()) as ValidateResponse;
    return data;
  } catch (err) {
    // Network-level failure (server unreachable, CORS, etc.)
    return {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
