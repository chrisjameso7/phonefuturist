import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  createCloudflareBatteryInferenceProvider,
} from '../src/lib/simulation/providers/cloudflare-battery-inference-provider';

import {
  createBatteryEvidenceSnapshotFromDevice,
} from '../src/lib/simulation/evidence-snapshot';

import {
  BATTERY_INFERENCE_PROMPT_VERSION,
  type BatteryInferenceRequest,
} from '../src/lib/simulation/inference-service';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
} from '../src/lib/simulation/inference';

function requestFixture(): BatteryInferenceRequest {
  return {
    scenario: {
      usageProfile: 'typical',
      network: 'wifi',
    },

    evidence:
      createBatteryEvidenceSnapshotFromDevice(
        {
          name: 'Test Device',
          energyWh: 19.25,
          displayAreaCm2: 105,
        },
        [],
      ),
  };
}

const artifact = {
  kind: 'battery',
  schemaVersion:
    SIMULATION_INFERENCE_SCHEMA_VERSION,

  status: 'insufficient_evidence',

  scenario: {
    usageProfile: 'typical',
    network: 'wifi',
  },

  evidence: [],
  assumptions: [],
  factors: [],
  limitations: [
    'No usable evidence.',
  ],
};

function contextFixture() {
  return {
    promptVersion:
      BATTERY_INFERENCE_PROMPT_VERSION,

    schemaVersion:
      SIMULATION_INFERENCE_SCHEMA_VERSION,
  } as const;
}

describe(
  'Cloudflare battery inference provider',
  () => {
    it(
      'sends the frozen prompt through the Responses API',
      async () => {
        const fetchMock = vi.fn(
          async (
            input: string | URL | Request,
            init?: RequestInit,
          ) => {
            expect(String(input)).toBe(
              'https://api.cloudflare.com/client/v4/accounts/account-test/ai/v1/responses',
            );

            expect(init?.method).toBe('POST');

            const headers =
              new Headers(init?.headers);

            expect(
              headers.get('Authorization'),
            ).toBe('Bearer token-test');

            expect(
              headers.get(
                'Content-Type',
              ),
            ).toBe('application/json');

            expect(
              headers.get(
                'cf-aig-gateway-id',
              ),
            ).toBe('gateway-test');

            const body =
              JSON.parse(
                String(init?.body),
              );

            expect(body.model).toBe(
              'model-test',
            );

            expect(body.stream).toBe(
              false,
            );

            expect(
              body.metadata
                .phonefuturist_prompt_version,
            ).toBe(
              BATTERY_INFERENCE_PROMPT_VERSION,
            );

            expect(
              body.metadata
                .phonefuturist_schema_version,
            ).toBe(
              SIMULATION_INFERENCE_SCHEMA_VERSION,
            );

            expect(body.input).toHaveLength(
              2,
            );

            expect(
              body.input[0].role,
            ).toBe('system');

            expect(
              body.input[0].content,
            ).toContain(
              'PhoneFuturist Interactive Leaks',
            );

            expect(
              body.input[1].role,
            ).toBe('user');

            expect(
              body.input[1].content,
            ).toContain(
              'FROZEN EVIDENCE SNAPSHOT',
            );

            return new Response(
              JSON.stringify({
                output: [
                  {
                    type: 'message',
                    content: [
                      {
                        type:
                          'output_text',
                        text:
                          JSON.stringify(
                            artifact,
                          ),
                      },
                    ],
                  },
                ],
              }),
              {
                status: 200,
                headers: {
                  'Content-Type':
                    'application/json',
                },
              },
            );
          },
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId:
                'account-test',

              apiToken:
                'token-test',

              gatewayId:
                'gateway-test',

              model:
                'model-test',

              fetch:
                fetchMock as typeof fetch,
            },
          );

        expect(provider.modelId).toBe(
          'cloudflare:model-test',
        );

        const result =
          await provider.inferBattery(
            requestFixture(),
            contextFixture(),
          );

        expect(result).toEqual(
          artifact,
        );

        expect(fetchMock).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      'supports top-level output_text responses',
      async () => {
        const fetchMock = vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                output_text:
                  JSON.stringify(
                    artifact,
                  ),
              }),
              {
                status: 200,
              },
            ),
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              fetch:
                fetchMock as typeof fetch,
            },
          );

        const result =
          await provider.inferBattery(
            requestFixture(),
            contextFixture(),
          );

        expect(result).toEqual(
          artifact,
        );
      },
    );

    it(
      'rejects malformed model JSON',
      async () => {
        const fetchMock = vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                output_text:
                  '{ definitely not json',
              }),
              {
                status: 200,
              },
            ),
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              fetch:
                fetchMock as typeof fetch,
            },
          );

        await expect(
          provider.inferBattery(
            requestFixture(),
            contextFixture(),
          ),
        ).rejects.toThrow(
          'model returned malformed JSON',
        );
      },
    );

    it(
      'rejects a successful API response with no model text',
      async () => {
        const fetchMock = vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                output: [],
              }),
              {
                status: 200,
              },
            ),
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              fetch:
                fetchMock as typeof fetch,
            },
          );

        await expect(
          provider.inferBattery(
            requestFixture(),
            contextFixture(),
          ),
        ).rejects.toThrow(
          'contained no model text',
        );
      },
    );

    it(
      'surfaces Cloudflare HTTP failures',
      async () => {
        const fetchMock = vi.fn(
          async () =>
            new Response(
              'Unauthorized',
              {
                status: 401,
              },
            ),
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              fetch:
                fetchMock as typeof fetch,
            },
          );

        await expect(
          provider.inferBattery(
            requestFixture(),
            contextFixture(),
          ),
        ).rejects.toThrow(
          'HTTP 401',
        );
      },
    );

    it(
      'rejects a non-JSON API response',
      async () => {
        const fetchMock = vi.fn(
          async () =>
            new Response(
              '<html>bad gateway</html>',
              {
                status: 200,
                headers: {
                  'Content-Type':
                    'text/html',
                },
              },
            ),
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              fetch:
                fetchMock as typeof fetch,
            },
          );

        await expect(
          provider.inferBattery(
            requestFixture(),
            contextFixture(),
          ),
        ).rejects.toThrow(
          'non-JSON API response',
        );
      },
    );

    it(
      'does not send a gateway header when no gateway is configured',
      async () => {
        const fetchMock = vi.fn(
          async (
            _input:
              string | URL | Request,
            init?: RequestInit,
          ) => {
            const headers =
              new Headers(init?.headers);

            expect(
              headers.has(
                'cf-aig-gateway-id',
              ),
            ).toBe(false);

            return new Response(
              JSON.stringify({
                output_text:
                  JSON.stringify(
                    artifact,
                  ),
              }),
              {
                status: 200,
              },
            );
          },
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              fetch:
                fetchMock as typeof fetch,
            },
          );

        await provider.inferBattery(
          requestFixture(),
          contextFixture(),
        );
      },
    );

    it(
      'fails immediately when required configuration is missing',
      () => {
        expect(() =>
          createCloudflareBatteryInferenceProvider(
            {
              accountId: '',
              apiToken: 'token',
              model: 'model',
            },
          ),
        ).toThrow(
          'requires accountId',
        );

        expect(() =>
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: '',
              model: 'model',
            },
          ),
        ).toThrow(
          'requires apiToken',
        );

        expect(() =>
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: '',
            },
          ),
        ).toThrow(
          'requires model',
        );
      },
    );

    it(
      'rejects invalid timeout configuration',
      () => {
        expect(() =>
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              timeoutMs: 0,
            },
          ),
        ).toThrow(
          'timeoutMs must be a positive finite number',
        );
      },
    );

    it(
      'aborts requests that exceed the configured timeout',
      async () => {
        const fetchMock = vi.fn(
          (
            _input:
              string | URL | Request,
            init?: RequestInit,
          ) =>
            new Promise<Response>(
              (_resolve, reject) => {
                init?.signal?.addEventListener(
                  'abort',
                  () => {
                    reject(
                      new DOMException(
                        'Aborted',
                        'AbortError',
                      ),
                    );
                  },
                );
              },
            ),
        );

        const provider =
          createCloudflareBatteryInferenceProvider(
            {
              accountId: 'account',
              apiToken: 'token',
              model: 'model',
              timeoutMs: 5,
              fetch:
                fetchMock as typeof fetch,
            },
          );

        await expect(
          provider.inferBattery(
            requestFixture(),
            contextFixture(),
          ),
        ).rejects.toThrow(
          'timed out after 5ms',
        );
      },
    );
  },
);