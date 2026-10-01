import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  settings:
    vi.fn(),

  createProvider:
    vi.fn(),

  createService:
    vi.fn(),

  infer:
    vi.fn(),

  createSnapshot:
    vi.fn(),
}));

vi.mock(
  '../src/lib/simulation/inference-settings',
  () => ({
    batteryInferenceSettings:
      mocks.settings,
  }),
);

vi.mock(
  '../src/lib/simulation/providers/cloudflare-battery-inference-provider',
  () => ({
    createCloudflareBatteryInferenceProvider:
      mocks.createProvider,
  }),
);

vi.mock(
  '../src/lib/simulation/inference-service',
  () => ({
    createBatteryInferenceService:
      mocks.createService,
  }),
);

vi.mock(
  '../src/lib/simulation/evidence-snapshot',
  () => ({
    createBatteryEvidenceSnapshotFromDevice:
      mocks.createSnapshot,
  }),
);

import {
  POST,
} from '../src/pages/api/simulation/battery-inference';

const settings = {
  accountId:
    'account-test',

  apiToken:
    'token-test',

  model:
    'model-test',
};

const provider = {
  modelId:
    'cloudflare:model-test',

  inferBattery:
    vi.fn(),
};

const evidence = {
  kind:
    'battery-evidence',

  snapshotId:
    'snapshot-test',
};

function body(
  overrides: Record<
    string,
    unknown
  > = {},
) {
  return {
    scenario: {
      usageProfile:
        'typical',

      network:
        'wifi',
    },

    device: {
      name:
        'Test Device',

      energyWh:
        19.25,

      displayAreaCm2:
        105,
    },

    ...overrides,
  };
}

function request(
  value: unknown = body(),
  headers: HeadersInit = {},
) {
  return new Request(
    'https://phonefuturist.test/api/simulation/battery-inference',
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/json',

        ...headers,
      },

      body:
        JSON.stringify(
          value,
        ),
    },
  );
}

function context(
  options: {
    user?: unknown;
    access?: unknown;
    request?: Request;
  } = {},
) {
  return {
    request:
      options.request ??
      request(),

    locals: {
      user:
        options.user ===
        undefined
          ? {
              id:
                'user-test',
            }
          : options.user,

      access:
        options.access ===
        undefined
          ? {
              active:
                true,
            }
          : options.access,
    },
  };
}

async function call(
  options: {
    user?: unknown;
    access?: unknown;
    request?: Request;
  } = {},
) {
  const response =
    await POST(
      context(
        options,
      ) as never,
    );

  return {
    response,

    json:
      await response.json(),
  };
}

describe(
  'battery inference API',
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mocks.settings
        .mockReturnValue(
          settings,
        );

      mocks.createProvider
        .mockReturnValue(
          provider,
        );

      mocks.createService
        .mockReturnValue({
          infer:
            mocks.infer,
        });

      mocks.createSnapshot
        .mockReturnValue(
          evidence,
        );

      mocks.infer
        .mockResolvedValue({
          status:
            'insufficient_evidence',

          envelope: {
            kind:
              'test-envelope',
          },
        });
    });

    it(
      'requires authentication',
      async () => {
        const {
          response,
          json,
        } =
          await call({
            user: null,
          });

        expect(
          response.status,
        ).toBe(401);

        expect(
          json.error,
        ).toContain(
          'Sign in',
        );

        expect(
          mocks.createSnapshot,
        ).not.toHaveBeenCalled();

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects inactive account access',
      async () => {
        const {
          response,
        } =
          await call({
            access: {
              active:
                false,
            },
          });

        expect(
          response.status,
        ).toBe(403);

        expect(
          mocks.createSnapshot,
        ).not.toHaveBeenCalled();

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects missing account access',
      async () => {
        const {
          response,
        } =
          await call({
            access: null,
          });

        expect(
          response.status,
        ).toBe(403);

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects non-JSON content',
      async () => {
        const badRequest =
          new Request(
            'https://phonefuturist.test/api/simulation/battery-inference',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'text/plain',
              },

              body:
                '{}',
            },
          );

        const {
          response,
        } =
          await call({
            request:
              badRequest,
          });

        expect(
          response.status,
        ).toBe(415);

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects malformed JSON',
      async () => {
        const badRequest =
          new Request(
            'https://phonefuturist.test/api/simulation/battery-inference',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                '{broken',
            },
          );

        const {
          response,
        } =
          await call({
            request:
              badRequest,
          });

        expect(
          response.status,
        ).toBe(400);

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects oversized requests',
      async () => {
        const oversized =
          new Request(
            'https://phonefuturist.test/api/simulation/battery-inference',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                'Content-Length':
                  String(
                    33 * 1024,
                  ),
              },

              body:
                '{}',
            },
          );

        const {
          response,
        } =
          await call({
            request:
              oversized,
          });

        expect(
          response.status,
        ).toBe(413);

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects invalid scenario input',
      async () => {
        const {
          response,
        } =
          await call({
            request:
              request({
                scenario: {
                  usageProfile:
                    'banana',
                },

                device: {},
              }),
          });

        expect(
          response.status,
        ).toBe(400);

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'requires custom workload percentages to total 100',
      async () => {
        const {
          response,
          json,
        } =
          await call({
            request:
              request({
                scenario: {
                  usageProfile:
                    'custom',

                  workload: {
                    webSocialPercent:
                      40,

                    videoPercent:
                      40,
                  },
                },

                device: {
                  energyWh:
                    19.25,
                },
              }),
          });

        expect(
          response.status,
        ).toBe(400);

        expect(
          JSON.stringify(
            json,
          ),
        ).toContain(
          'total 100',
        );

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects client-supplied evidence',
      async () => {
        const {
          response,
        } =
          await call({
            request:
              request(
                body({
                  evidence: {
                    kind:
                      'battery-evidence',

                    snapshotId:
                      'forged-client-snapshot',
                  },
                }),
              ),
          });

        expect(
          response.status,
        ).toBe(400);

        expect(
          mocks.createSnapshot,
        ).not.toHaveBeenCalled();

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'creates evidence on the server from the validated device',
      async () => {
        const {
          response,
        } =
          await call();

        expect(
          response.status,
        ).toBe(200);

        expect(
          mocks.createSnapshot,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          mocks.createSnapshot,
        ).toHaveBeenCalledWith({
          name:
            'Test Device',

          energyWh:
            19.25,

          displayAreaCm2:
            105,
        });

        expect(
          mocks.infer,
        ).toHaveBeenCalledWith({
          scenario: {
            usageProfile:
              'typical',

            network:
              'wifi',
          },

          evidence,
        });
      },
    );

    it(
      'returns ready inference results',
      async () => {
        mocks.infer
          .mockResolvedValue({
            status:
              'ready',

            envelope: {
              kind:
                'ready-envelope',
            },
          });

        const {
          response,
          json,
        } =
          await call();

        expect(
          response.status,
        ).toBe(200);

        expect(
          json,
        ).toEqual({
          status:
            'ready',

          envelope: {
            kind:
              'ready-envelope',
          },
        });
      },
    );

    it(
      'returns insufficient evidence results without converting them into errors',
      async () => {
        const {
          response,
          json,
        } =
          await call();

        expect(
          response.status,
        ).toBe(200);

        expect(
          json.status,
        ).toBe(
          'insufficient_evidence',
        );
      },
    );

    it(
      'maps invalid provider output to 502',
      async () => {
        mocks.infer
          .mockResolvedValue({
            status:
              'invalid_provider_output',

            issues: [
              'Invalid artifact.',
            ],
          });

        const {
          response,
          json,
        } =
          await call();

        expect(
          response.status,
        ).toBe(502);

        expect(
          json.status,
        ).toBe(
          'invalid_provider_output',
        );
      },
    );

    it(
      'maps provider failures to 502',
      async () => {
        mocks.infer
          .mockResolvedValue({
            status:
              'provider_error',

            message:
              'Provider unavailable.',
          });

        const {
          response,
          json,
        } =
          await call();

        expect(
          response.status,
        ).toBe(502);

        expect(
          json.status,
        ).toBe(
          'provider_error',
        );
      },
    );

    it(
      'returns 503 when inference is not configured',
      async () => {
        mocks.settings
          .mockReturnValue(
            null,
          );

        const {
          response,
        } =
          await call();

        expect(
          response.status,
        ).toBe(503);

        expect(
          mocks.createProvider,
        ).not.toHaveBeenCalled();

        expect(
          mocks.infer,
        ).not.toHaveBeenCalled();
      },
    );
  },
);