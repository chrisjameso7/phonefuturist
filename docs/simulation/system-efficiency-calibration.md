# System Efficiency Calibration Strategy

## Goal

Model how much real devices outperform or underperform a hardware-only energy baseline without hardcoding brand reputations.

A software/system coefficient is not a brand score. It is a workload-specific residual derived after controlling for battery energy, display behavior, SoC, modem, thermals, resolution, refresh policy, brightness, and test protocol.

## Source policy

Use at least four independent sources where possible. Protocols must remain separate.

Primary source roles:

- Notebookcheck: common-protocol runtime, power-consumption and thermal spine.
- GSMArena: active-use web/video/gaming cross-check.
- Tom's Guide: controlled cellular web and benchmark cross-check.
- PhoneArena: browsing/video/gaming battery cross-check.
- DXOMARK: display and camera subsystem context when relevant.

Never average values from incompatible protocols into a single observed runtime. Instead, store each protocol separately and fit protocol-specific residuals.

## Cohort 01

Eight manufacturers are represented in the first seed cohort:

Apple, Samsung, Google, OnePlus, Xiaomi, Oppo, Vivo, and Honor.

The initial devices are:

- Apple iPhone 17 Pro Max
- Samsung Galaxy S25 Ultra
- Google Pixel 10 Pro XL
- OnePlus 13
- Xiaomi 15 Ultra
- Oppo Find X8 Pro
- Vivo X200 Pro
- Honor Magic7 Pro

## What the first pass already shows

Battery capacity alone is not a sufficient predictor. In Notebookcheck's common Wi-Fi protocol, the iPhone 17 Pro Max reaches 28.6 hours from a 4,823 mAh pack, while larger Android packs in this cohort commonly land around 19 to 25 hours. That is evidence of a large system-level residual, but it must not be attributed to software alone until display, SoC, modem, usable battery energy, and protocol conditions are normalized.

The Galaxy S25 Ultra is another useful case: its 5,000 mAh pack produces 22.2 hours in the same Notebookcheck Wi-Fi protocol, while its measured GFXBench power draw is much higher than some peers. This makes it valuable for separating workload efficiency from peak-load behavior.

The Pixel 10 Pro XL is the opposite kind of calibration point. Its 5,200 mAh battery produces 19.2 hours in Notebookcheck Wi-Fi and much shorter gaming runtimes in GSMArena and PhoneArena than several peers. This prevents the model from learning a simplistic "large battery = strong endurance" rule.

## Residual derivation

For each device, workload and protocol:

1. Convert battery capacity to usable energy where nominal voltage and usable fraction are known.
2. Estimate hardware-only workload power from display, SoC, modem, memory, media engines, thermals and peripherals.
3. Compare predicted drain with measured protocol drain.
4. Attribute the unexplained residual to a system-efficiency term only after known hardware differences are accounted for.
5. Retain uncertainty and source provenance.

Conceptually:

observed_drain = hardware_baseline * system_efficiency_multiplier

therefore:

system_efficiency_multiplier = observed_drain / hardware_baseline

Values below 1.0 indicate lower consumption than the modeled hardware baseline. Values above 1.0 indicate higher consumption.

## Brand scaling plan

The final corpus should cover essentially every meaningful smartphone OEM and sub-brand with released devices that have usable public evidence.

Priority families:

Apple; Samsung; Google; OnePlus; Oppo; Vivo; iQOO; Xiaomi; Redmi; Poco; Honor; Huawei; Realme; Motorola; Nothing; Asus; Sony; ZTE; Nubia; RedMagic; Meizu; Tecno; Infinix; itel; HMD; Nokia-era references; Fairphone; Sharp; Leica phone collaborations where distinct; foldable-specialist and gaming-device lines.

Brand labels are metadata only. Calibration happens at the device and workload level first, then optional manufacturer/platform priors may be learned from many devices with shrinkage toward neutral. No manufacturer gets a fixed advantage.

## Next expansion

Cohort 02 should grow to at least 40 devices and deliberately include:

- two or more generations per major OEM,
- Snapdragon, Tensor, Apple Silicon, Exynos and Dimensity families,
- conventional lithium and silicon-carbon batteries,
- compact and large flagships,
- foldables,
- gaming phones,
- midrange devices,
- regional battery variants.

The long-term target remains about 2,000 phones, with roughly 300 to 600 deep-calibration devices carrying the richest measurements.
