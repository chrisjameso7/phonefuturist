import type { APIRoute } from 'astro';
import { serverClient } from '../../lib/supabase';
import {
  validatePredictionSnapshotForStorage,
} from '../../lib/simulation/prediction-history';

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'content-type':
          'application/json',
        'cache-control':
          'no-store',
      },
    },
  );
}

async function authenticatedClient(
  request: Request,
  cookies: Parameters<
    typeof serverClient
  >[0],
) {
  const supabase =
    serverClient(
      cookies,
      request,
    );

  if (!supabase) {
    return {
      ok: false as const,
      status: 503,
      error:
        'Prediction storage is not configured.',
    };
  }

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      error:
        'Sign in is required to save prediction history.',
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
  };
}

export const POST: APIRoute =
  async ({
    request,
    cookies,
  }) => {
    const auth =
      await authenticatedClient(
        request,
        cookies,
      );

    if (!auth.ok) {
      return json(
        {
          ok: false,
          error: auth.error,
        },
        auth.status,
      );
    }

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return json(
        {
          ok: false,
          error:
            'Invalid JSON payload.',
        },
        400,
      );
    }

    const payload =
      (
        body &&
        typeof body ===
          'object' &&
        !Array.isArray(body)
      )
        ? (
            body as Record<
              string,
              unknown
            >
          ).snapshot
        : undefined;

    const validated =
      validatePredictionSnapshotForStorage(
        payload,
      );

    if (!validated.ok) {
      return json(
        {
          ok: false,
          error:
            validated.error,
        },
        400,
      );
    }

    const snapshot =
      validated.value;

    const { error } =
      await auth.supabase
        .from(
          'simulation_predictions',
        )
        .insert({
          id: snapshot.id,
          user_id:
            auth.user.id,
          device_name:
            snapshot.deviceName,
          engine_version:
            snapshot.engineVersion ??
            null,
          corpus_version:
            snapshot.corpusVersion ??
            null,
          simulator_version:
            snapshot.simulatorVersion ??
            null,
          prediction_snapshot:
            snapshot,
        });

    if (error) {
      console.error(
        'Failed to save simulation prediction',
        {
          code: error.code,
          message:
            error.message,
        },
      );

      return json(
        {
          ok: false,
          error:
            error.code ===
            '23505'
              ? 'This prediction snapshot has already been saved.'
              : 'Prediction could not be saved right now.',
        },
        error.code ===
          '23505'
          ? 409
          : 503,
      );
    }

    return json(
      {
        ok: true,
        id: snapshot.id,
      },
      201,
    );
  };

export const GET: APIRoute =
  async ({
    request,
    cookies,
  }) => {
    const auth =
      await authenticatedClient(
        request,
        cookies,
      );

    if (!auth.ok) {
      return json(
        {
          ok: false,
          error: auth.error,
        },
        auth.status,
      );
    }

    const { data, error } =
      await auth.supabase
        .from(
          'simulation_predictions',
        )
        .select(
          [
            'id',
            'device_name',
            'engine_version',
            'corpus_version',
            'simulator_version',
            'prediction_snapshot',
            'created_at',
          ].join(','),
        )
        .eq(
          'user_id',
          auth.user.id,
        )
        .order(
          'created_at',
          {
            ascending: false,
          },
        )
        .limit(100);

    if (error) {
      console.error(
        'Failed to list simulation predictions',
        {
          code: error.code,
          message:
            error.message,
        },
      );

      return json(
        {
          ok: false,
          error:
            'Prediction history could not be loaded.',
        },
        503,
      );
    }

    return json({
      ok: true,
      predictions:
        data ?? [],
    });
  };
