import type { APIRoute } from 'astro';
import { serverClient } from '../../lib/supabase';
import {
  canTriageBetaFeedback,
  isBetaFeedbackStatus,
} from '../../lib/simulation/beta-feedback';

async function staffClient(
  request: Request,
  cookies: Parameters<typeof serverClient>[0],
) {
  const supabase = serverClient(cookies, request);

  if (!supabase) {
    return {
      ok: false as const,
      status: 503,
      error: 'Feedback storage is not configured.',
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      error: 'Sign in is required.',
    };
  }

  const { data, error } = await supabase.rpc(
    'foundation_access',
  );

  if (
    error ||
    !canTriageBetaFeedback(
      data as Parameters<
        typeof canTriageBetaFeedback
      >[0],
    )
  ) {
    return {
      ok: false as const,
      status: 403,
      error:
        'Editorial beta-feedback access is required.',
    };
  }

  return {
    ok: true as const,
    supabase,
  };
}

function json(
  body: unknown,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

export const GET: APIRoute = async ({
  request,
  cookies,
  url,
}) => {
  const staff = await staffClient(
    request,
    cookies,
  );

  if (!staff.ok) {
    return json(
      {
        ok: false,
        error: staff.error,
      },
      staff.status,
    );
  }

  const requestedStatus =
    url.searchParams.get('status');

  if (
    requestedStatus &&
    !isBetaFeedbackStatus(requestedStatus)
  ) {
    return json(
      {
        ok: false,
        error: 'Feedback status is invalid.',
      },
      400,
    );
  }

  let query = staff.supabase
    .from('simulator_feedback')
    .select(
      [
        'id',
        'reference',
        'user_id',
        'category',
        'message',
        'expected_behavior',
        'simulator_mode',
        'simulator_version',
        'engine_version',
        'corpus_version',
        'simulation_snapshot',
        'status',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .order('created_at', {
      ascending: false,
    })
    .limit(100);

  if (requestedStatus) {
    query = query.eq(
      'status',
      requestedStatus,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      'Failed to list simulator beta feedback',
      {
        code: error.code,
        message: error.message,
      },
    );

    return json(
      {
        ok: false,
        error:
          'Feedback reports could not be loaded.',
      },
      503,
    );
  }

  return json({
    ok: true,
    reports: data ?? [],
  });
};

export const PATCH: APIRoute = async ({
  request,
  cookies,
}) => {
  const staff = await staffClient(
    request,
    cookies,
  );

  if (!staff.ok) {
    return json(
      {
        ok: false,
        error: staff.error,
      },
      staff.status,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        ok: false,
        error: 'Invalid JSON payload.',
      },
      400,
    );
  }

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    return json(
      {
        ok: false,
        error: 'Update payload must be an object.',
      },
      400,
    );
  }

  const row = body as Record<string, unknown>;
  const reference =
    typeof row.reference === 'string'
      ? row.reference.trim()
      : '';

  if (
    !/^PF-BETA-[A-Z0-9]{8}$/.test(
      reference,
    )
  ) {
    return json(
      {
        ok: false,
        error: 'Feedback reference is invalid.',
      },
      400,
    );
  }

  if (!isBetaFeedbackStatus(row.status)) {
    return json(
      {
        ok: false,
        error: 'Feedback status is invalid.',
      },
      400,
    );
  }

  const { data, error } = await staff.supabase
    .from('simulator_feedback')
    .update({
      status: row.status,
    })
    .eq('reference', reference)
    .select('reference,status,updated_at')
    .maybeSingle();

  if (error) {
    console.error(
      'Failed to update simulator beta feedback',
      {
        code: error.code,
        message: error.message,
      },
    );

    return json(
      {
        ok: false,
        error:
          'Feedback report could not be updated.',
      },
      503,
    );
  }

  if (!data) {
    return json(
      {
        ok: false,
        error: 'Feedback report was not found.',
      },
      404,
    );
  }

  return json({
    ok: true,
    report: data,
  });
};
