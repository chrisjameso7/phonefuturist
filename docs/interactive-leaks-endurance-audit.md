# Endurance audit — battery-calibration-2.1

Actual production resolver; no validation records fitted. Published pack energy divided by runtime is derived power, not measured watts.

## Internal leave-one-device-out, same Wi-Fi protocol

Calibration-set cross-validation, not independent held-out validation. Population extrema are a reference envelope, not an uncertainty interval.

| Device | Observed h | Reference envelope h | Midpoint absolute gap h | Midpoint signed gap % | Inside envelope |
|---|---:|---:|---:|---:|---|
| iPhone 16 Pro Max | 20.82 | 15.72–21.39 | 2.26 | -10.8 | true |
| Pixel 9 Pro XL | 16.63 | 19.37–22.63 | 4.37 | 26.3 | false |
| OnePlus 13 | 22.48 | 19.31–26.27 | 0.30 | 1.4 | true |
| Galaxy S24 Ultra | 19.13 | 16.30–22.18 | 0.11 | 0.6 | true |
| Galaxy S25 Ultra | 22.18 | 16.30–21.59 | 3.24 | -14.6 | false |

## Held-out records: different protocol, descriptive only

| Device | Wi-Fi calibration h | Cellular held-out h | Wi-Fi / cellular gap % | Accuracy error |
|---|---:|---:|---:|---|
| Galaxy S24 Ultra | 19.13 | 16.75 | 14.2 | N/A: protocol differs |
| iPhone 16 Pro Max | 20.82 | 17.63 | 18.1 | N/A: protocol differs |
| Pixel 9 Pro XL | 16.63 | 14.10 | 18.0 | N/A: protocol differs |

## Daily profiles: no comparable measured mixed-use records

| Device | Profile | Daily verdict | Unaccounted h | Accuracy error |
|---|---|---|---:|---|
| iPhone 16 Pro Max | Light | insufficient-evidence | 23.00 | N/A: no comparable observations |
| iPhone 16 Pro Max | Typical | insufficient-evidence | 22.00 | N/A: no comparable observations |
| iPhone 16 Pro Max | Heavy | insufficient-evidence | 21.00 | N/A: no comparable observations |
| iPhone 16 Pro Max | Custom | insufficient-evidence | 23.00 | N/A: no comparable observations |
| Pixel 9 Pro XL | Light | insufficient-evidence | 23.00 | N/A: no comparable observations |
| Pixel 9 Pro XL | Typical | insufficient-evidence | 22.00 | N/A: no comparable observations |
| Pixel 9 Pro XL | Heavy | insufficient-evidence | 21.00 | N/A: no comparable observations |
| Pixel 9 Pro XL | Custom | insufficient-evidence | 23.00 | N/A: no comparable observations |
| OnePlus 13 | Light | insufficient-evidence | 23.00 | N/A: no comparable observations |
| OnePlus 13 | Typical | insufficient-evidence | 22.00 | N/A: no comparable observations |
| OnePlus 13 | Heavy | insufficient-evidence | 21.00 | N/A: no comparable observations |
| OnePlus 13 | Custom | insufficient-evidence | 23.00 | N/A: no comparable observations |
| Galaxy S24 Ultra | Light | insufficient-evidence | 23.00 | N/A: no comparable observations |
| Galaxy S24 Ultra | Typical | insufficient-evidence | 22.00 | N/A: no comparable observations |
| Galaxy S24 Ultra | Heavy | insufficient-evidence | 21.00 | N/A: no comparable observations |
| Galaxy S24 Ultra | Custom | insufficient-evidence | 23.00 | N/A: no comparable observations |
| Galaxy S25 Ultra | Light | insufficient-evidence | 23.00 | N/A: no comparable observations |
| Galaxy S25 Ultra | Typical | insufficient-evidence | 22.00 | N/A: no comparable observations |
| Galaxy S25 Ultra | Heavy | insufficient-evidence | 21.00 | N/A: no comparable observations |
| Galaxy S25 Ultra | Custom | insufficient-evidence | 23.00 | N/A: no comparable observations |

Calibration IDs: meas_battery_000003, meas_battery_000004, meas_battery_000005, meas_battery_000001, meas_battery_000002

Held-out IDs: meas_battery_000006, meas_battery_000007, meas_battery_000008

No multipliers or fitted corrections. Missing: gaming, video, camera and standby power; independent same-protocol and mixed-use validation. A claimed 2× real-world error cannot be quantified from these data.
