import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, smallJson } from '../../lib/labs/http';
import { valueDevice } from '../../lib/valuation/engine';
import { deviceParameters, object } from '../../lib/valuation/validation';
import { cloudflareGenerator, type ValuationEnvironment } from '../../lib/valuation/cloudflare';
export const POST: APIRoute = async (context) => {
    let body: Record<string, unknown>;
    try {
        body = object(await smallJson(context.request));
        if (body.kind !== 'bom' && body.kind !== 'battery' && body.kind !== 'simple-battery')
            throw new Error();
        if (body.kind === 'bom')
            deviceParameters(body.parameters);
        else if (body.kind === 'simple-battery')
            (await import('../../lib/valuation/simple-battery')).simpleBatteryParameters(body.parameters);
        else
            (await import('../../lib/valuation/battery')).batteryParameters(body.parameters);
    }
    catch {
        return json({ error: 'Check the hardware specifications and try again.' }, 400);
    }
    const runtime = env as ValuationEnvironment;
    let generate = cloudflareGenerator(runtime);
    // Paid inference is only used for verified active sessions, with a configured platform limiter.
    // No schema/policy changes or new service-role access required. Baseline remains public.
    const access = context.locals.access;
    if (body.analyze !== true || !context.locals.user || !access?.active || !access.verified || !runtime.AI_VALUATION_LIMITER)
        generate = undefined;
    if (generate)
        try {
            const rate = await runtime.AI_VALUATION_LIMITER!.limit({ key: context.locals.user!.id });
            if (!rate.success)
                generate = undefined;
        }
        catch {
            generate = undefined;
        }
    if (body.kind === 'simple-battery') {
        const { analyzeSimpleBatteryWithFallback } = await import('../../lib/valuation/simple-battery');
        return json(await analyzeSimpleBatteryWithFallback(body.parameters, generate));
    }
    if (body.kind === 'battery') {
        const { analyzeBattery } = await import('../../lib/valuation/battery');
        return json(await analyzeBattery(body.parameters, generate));
    }
    const result = await valueDevice(body.parameters, generate);
    if (body.analyze === true && !context.locals.user)
        result.notice = 'Sign in with a verified account for AI analysis. Baseline analysis shown.';
    return json(result);
};
