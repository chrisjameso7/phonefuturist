// Planning values in USD, not negotiated OEM quotes. Source review is recorded
// in docs/labs-component-pricing.md; never promote an estimate to a quotation.
export type BomDevice = 'phone' | 'foldable' | 'tablet' | 'laptop';
export type BomOption = {
    id: string;
    name: string;
    cost: number;
    basis: 'estimate' | 'user';
    configured?: boolean;
};
export type BomGroup = {
    id: string;
    label: string;
    section: string;
    options: BomOption[];
};
type Entry = [
    name: string,
    cost: number,
    id?: string,
    basis?: 'user'
];
function group(id: string, label: string, section: string, entries: Entry[]): BomGroup {
    return { id, label, section, options: entries.map(([name, cost, key, basis]) => ({
            id: key ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, cost, basis: basis ?? 'estimate',
        })) };
}
export const BOM_GROUPS: BomGroup[] = [
    group('silicon', 'Processor', 'Core', [
        ['Flagship 3nm', 170, 'flagship'], ['Sub-flagship', 95, 'sub'], ['Custom silicon', 200, 'custom'],
        ['Exynos 2700', 260, 'exynos-2700', 'user'], ['Snapdragon 8 Elite Extreme Gen 6', 300, 'sd-elite-extreme-6', 'user'], ['Snapdragon 8 Elite Gen 6', 250, 'sd-elite-6', 'user'],
        ['Snapdragon 8 Elite Gen 5', 260], ['Snapdragon 8 Elite', 220], ['Snapdragon 8 Gen 3', 185], ['Snapdragon 8 Gen 2', 160], ['Snapdragon 8s Gen 4', 100], ['Snapdragon 7+ Gen 3', 75], ['Snapdragon 7 Gen 4', 65], ['Snapdragon 6 Gen 4', 42], ['Snapdragon 4 Gen 2', 28],
        ['Exynos 2600', 210], ['Exynos 2500', 170], ['Exynos 2400', 130], ['Exynos 1580', 65], ['Exynos 1480', 48],
        ['Dimensity 9600', 220], ['Dimensity 9500', 180], ['Dimensity 9400', 150], ['Dimensity 9300', 120], ['Dimensity 8400', 80], ['Dimensity 8300', 65], ['Dimensity 7300', 42], ['Helio G99', 25],
        ['Apple A20 Pro', 210], ['Apple A19 Pro', 180], ['Apple A18 Pro', 150], ['Apple A18', 125], ['Apple M5', 280], ['Apple M5 Pro', 420], ['Apple M4', 230], ['Apple M4 Pro', 360],
        ['Google Tensor G5', 150], ['Google Tensor G4', 115], ['Kirin 9030', 170], ['Kirin 9020', 145], ['Unisoc T820', 32],
        ['Snapdragon X Elite', 260], ['Snapdragon X Plus', 200], ['Intel Core Ultra 7 258V package', 400], ['Intel Core Ultra 5 226V package', 310], ['Intel Core Ultra 7 155H', 300], ['AMD Ryzen AI 9 HX 370', 400], ['AMD Ryzen AI 7 350', 280], ['AMD Ryzen 7 8840U', 230],
    ]),
    group('ram', 'Memory', 'Core', [['4 GB LPDDR4X', 9], ['6 GB LPDDR4X', 13], ['8 GB LPDDR5', 20], ['8 GB LPDDR5X', 24], ['12 GB LPDDR5X', 36], ['16 GB LPDDR5X', 48], ['24 GB LPDDR5X', 72], ['32 GB LPDDR5X', 96], ['64 GB LPDDR5X', 192], ['16 GB DDR5 SO-DIMM', 38], ['32 GB DDR5 SO-DIMM', 72], ['64 GB DDR5 SO-DIMM', 140], ['Memory included in processor package', 0]]),
    group('storage', 'Primary storage', 'Core', [['64 GB eMMC', 6], ['128 GB UFS 2.2', 11], ['128 GB UFS 3.1', 14], ['256 GB UFS 3.1', 22], ['256 GB UFS 4.0', 28], ['512 GB UFS 4.0', 48], ['1 TB UFS 4.0', 85], ['2 TB UFS 4.0', 155], ['256 GB NVMe Gen 4', 20], ['512 GB NVMe Gen 4', 32], ['1 TB NVMe Gen 4', 52], ['2 TB NVMe Gen 4', 94], ['4 TB NVMe Gen 4', 185], ['1 TB NVMe Gen 5', 90], ['2 TB NVMe Gen 5', 155]]),
    group('gpu', 'Discrete graphics', 'Core', [['None / integrated graphics', 0, 'none'], ['Entry mobile GPU · 6 GB', 150], ['Midrange mobile GPU · 8 GB', 250], ['Performance mobile GPU · 12 GB', 400], ['Flagship mobile GPU · 16 GB', 650], ['Workstation mobile GPU · 16 GB', 850]]),
    group('board', 'Mainboard', 'Core', [['Compact 8-layer PCB', 12], ['10-layer HDI PCB', 18], ['12-layer stacked HDI', 26], ['Foldable split mainboard', 38], ['Tablet logic board', 24], ['Laptop motherboard', 65], ['Workstation motherboard', 100]]),
    group('display', 'Primary display', 'Displays', [['M16 OLED', 83, 'm16'], ['M14 OLED', 65, 'm14'], ['Standard LTPO', 49, 'ltpo'], ['LTPS OLED', 36], ['IPS LCD', 22], ['7.6-inch folding OLED', 145], ['8-inch folding OLED', 165], ['6.9-inch flip OLED', 115], ['10.9-inch IPS tablet panel', 55], ['11-inch OLED tablet panel', 100], ['12.9-inch Mini LED panel', 145], ['13-inch tandem OLED', 195], ['14-inch IPS laptop panel', 65], ['14-inch OLED laptop panel', 115], ['16-inch OLED laptop panel', 155], ['16-inch Mini LED panel', 185], ['17.3-inch IPS laptop panel', 95]]),
    group('coverDisplay', 'Cover display', 'Displays', [['None', 0, 'none'], ['1.9-inch cover OLED', 16], ['3.4-inch cover OLED', 27], ['4-inch cover OLED', 35], ['6.3-inch cover OLED', 58], ['6.5-inch LTPO cover OLED', 74]]),
    group('touch', 'Touch digitizer', 'Displays', [['Integrated in panel', 0, 'none'], ['Phone capacitive digitizer', 5], ['Foldable flexible digitizer', 14], ['Tablet digitizer', 12], ['Laptop touch digitizer', 22], ['Active pen digitizer', 20]]),
    group('glass', 'Display protection', 'Displays', [['Standard aluminosilicate glass', 5], ['Strengthened flagship glass', 10], ['Anti-reflective cover glass', 16], ['Ultra-thin foldable glass', 22], ['Tablet strengthened glass', 18], ['Laptop cover glass', 26], ['Matte etched finish', 30]]),
    group('sensor', 'Main camera sensor', 'Imaging', [['Sony LYT-900', 48, 'lyt900'], ['ISOCELL HP2', 38, 'hp2'], ['Sony IMX890', 23, 'imx890'], ['Sony LYT-808', 31], ['Sony LYT-700', 25], ['Sony IMX989', 44], ['Sony IMX882', 18], ['Sony IMX766', 19], ['ISOCELL HP3', 29], ['ISOCELL GN2', 34], ['OmniVision OV50H', 30], ['OmniVision OV50K', 36], ['None', 0, 'none']]),
    group('ultrawide', 'Ultrawide camera', 'Imaging', [['None', 0, 'none'], ['8 MP ultrawide module', 4], ['12 MP ultrawide module', 9], ['48 MP ultrawide module', 17], ['50 MP ultrawide module', 21], ['50 MP autofocus ultrawide', 27]]),
    group('telephoto', 'Telephoto camera', 'Imaging', [['None', 0, 'none'], ['12 MP 2× module', 12], ['10 MP 3× OIS module', 17], ['50 MP 3× OIS module', 28], ['50 MP 5× periscope', 42], ['200 MP periscope', 65], ['Continuous optical zoom module', 80]]),
    group('frontCamera', 'Front camera', 'Imaging', [['None', 0, 'none'], ['5 MP webcam', 3], ['8 MP module', 4], ['12 MP autofocus module', 9], ['32 MP module', 11], ['50 MP autofocus module', 17], ['1080p laptop webcam', 6], ['4K laptop webcam', 15], ['Under-display camera', 20]]),
    group('lens', 'Main lens and stabilization', 'Imaging', [['Fixed lens · no OIS', 4], ['6P lens with OIS', 10], ['7P lens with OIS', 16], ['8P lens with OIS', 22], ['Variable aperture lens', 29], ['Sensor-shift module', 32], ['None', 0, 'none']]),
    group('depth', 'Depth sensing', 'Imaging', [['None', 0, 'none'], ['Laser autofocus', 3], ['Time-of-flight module', 7], ['Structured-light depth kit', 18], ['LiDAR module', 24]]),
    group('battery', 'Battery pack', 'Power', [['4000 mAh Li-ion', 9], ['5000 mAh Li-ion', 12], ['5500 mAh silicon-carbon', 17], ['6000 mAh silicon-carbon', 20], ['7000 mAh silicon-carbon', 24], ['Foldable dual-cell · 5000 mAh', 22], ['Tablet · 30 Wh', 25], ['Tablet · 40 Wh', 32], ['Tablet · 50 Wh', 40], ['Laptop · 50 Wh', 38], ['Laptop · 70 Wh', 53], ['Laptop · 90 Wh', 70], ['Laptop · 99 Wh', 82]]),
    group('charging', 'Wired charging controller', 'Power', [['18 W USB PD', 3], ['30 W USB PD', 4], ['65 W USB PD', 7], ['100 W USB PD', 11], ['140 W USB PD EPR', 17], ['240 W USB PD EPR', 26], ['120 W dual charge pump', 13], ['240 W dual charge pump', 22]]),
    group('wirelessCharging', 'Wireless charging', 'Power', [['None', 0, 'none'], ['15 W Qi coil and controller', 6], ['25 W magnetic Qi2 module', 12], ['50 W wireless module', 17], ['80 W wireless module', 23]]),
    group('pmic', 'Power management', 'Power', [['Phone PMIC set', 7], ['Flagship PMIC set', 12], ['Foldable PMIC set', 16], ['Tablet PMIC set', 14], ['Laptop multiphase power stage', 28]]),
    group('charger', 'Included adapter', 'Power', [['None', 0, 'none'], ['30 W wall adapter', 5], ['65 W GaN adapter', 11], ['100 W GaN adapter', 18], ['140 W GaN adapter', 26], ['240 W laptop adapter', 38]]),
    group('cooling', 'Cooling system', 'Thermals', [['Graphite sheet', 2], ['Small vapor chamber', 5], ['Large vapor chamber', 10], ['Stacked vapor chamber', 16], ['Tablet graphite and copper', 9], ['Laptop heatpipe and fan', 19], ['Laptop dual fan and heatpipe', 32], ['Laptop vapor chamber and dual fan', 48]]),
    group('thermalInterface', 'Thermal interface', 'Thermals', [['Standard thermal paste', 1], ['Phase-change pad', 3], ['Graphite interface pad', 4], ['Liquid metal interface', 7]]),
    group('chassis', 'Frame / chassis', 'Build', [['Titanium Grade 5', 42, 'titanium'], ['Aerospace aluminum', 21, 'aluminum'], ['Ceramic', 34, 'ceramic'], ['Glass / plastic', 12, 'glass'], ['Magnesium frame', 28], ['Foldable reinforced aluminum', 38], ['Tablet aluminum unibody', 36], ['Laptop aluminum unibody', 72], ['Laptop magnesium chassis', 88], ['Carbon-fiber reinforced chassis', 110]]),
    group('back', 'Rear housing', 'Build', [['Polycarbonate rear', 3], ['Glass rear', 8], ['Textured composite rear', 11], ['Ceramic rear', 19], ['Aluminum rear', 15], ['Laptop bottom cover', 22]]),
    group('hinge', 'Hinge assembly', 'Build', [['None', 0, 'none'], ['Flip teardrop hinge', 23], ['Book teardrop hinge', 38], ['Book reinforced hinge', 52], ['Laptop friction hinge pair', 9], ['Laptop 360-degree hinge pair', 19], ['Tablet kickstand hinge', 14]]),
    group('sealing', 'Sealing and protection', 'Build', [['Basic seals', 2], ['Splash-resistant seal kit', 4], ['Water-resistant phone seal kit', 7], ['Foldable brush and seal kit', 10], ['Laptop port gaskets', 5]]),
    group('haptics', 'Haptic actuator', 'Audio & input', [['None', 0, 'none'], ['ERM vibration motor', 1], ['Z-axis linear actuator', 3], ['X-axis linear actuator', 5], ['Large linear actuator', 8], ['Dual linear actuators', 13]]),
    group('speakers', 'Speakers', 'Audio & input', [['Single micro-speaker', 2], ['Stereo phone speakers', 5], ['Four-speaker tablet array', 12], ['Laptop stereo array', 9], ['Six-speaker laptop array', 22]]),
    group('microphones', 'Microphones', 'Audio & input', [['Single MEMS mic', 1], ['Dual MEMS microphones', 2], ['Triple MEMS array', 4], ['Four-mic beamforming array', 7]]),
    group('keyboard', 'Keyboard', 'Audio & input', [['None', 0, 'none'], ['Membrane keyboard', 9], ['Backlit scissor keyboard', 18], ['RGB laptop keyboard', 29], ['Mechanical laptop keyboard', 48], ['Tablet keyboard folio', 35]]),
    group('touchpad', 'Touchpad', 'Audio & input', [['None', 0, 'none'], ['Plastic clickpad', 6], ['Glass precision touchpad', 13], ['Haptic glass touchpad', 26]]),
    group('pen', 'Stylus', 'Audio & input', [['None', 0, 'none'], ['Passive stylus', 2], ['Active pressure stylus', 16], ['Rechargeable active pen', 25], ['Integrated pen and silo', 22]]),
    group('wifi', 'Wi-Fi and Bluetooth', 'Connectivity', [['Integrated in processor package', 0, 'none'], ['Wi-Fi 5 + Bluetooth module', 3], ['Wi-Fi 6 + Bluetooth module', 5], ['Wi-Fi 6E + Bluetooth module', 8], ['Wi-Fi 7 + Bluetooth module', 13], ['Laptop Wi-Fi 7 card', 17]]),
    group('modem', 'Cellular modem', 'Connectivity', [['Integrated / Wi-Fi only', 0, 'none'], ['4G discrete modem', 13], ['5G sub-6 discrete modem', 29], ['5G flagship discrete modem', 45]]),
    group('rf', 'RF front-end and antennas', 'Connectivity', [['Wi-Fi antenna set', 2], ['4G RF front-end', 7], ['5G sub-6 RF front-end', 16], ['5G mmWave RF front-end', 36], ['Foldable multiband antenna set', 22]]),
    group('proximity', 'NFC / UWB', 'Connectivity', [['None', 0, 'none'], ['NFC module', 2], ['NFC + secure element', 4], ['NFC + UWB kit', 9]]),
    group('ports', 'Ports and daughterboard', 'Connectivity', [['USB 2.0 Type-C board', 3], ['USB 3.2 Type-C board', 6], ['Dual USB4 laptop board', 18], ['Thunderbolt port board', 28], ['HDMI and card reader board', 14], ['Dock connector', 8]]),
    group('biometrics', 'Biometrics', 'Sensors', [['None', 0, 'none'], ['Side capacitive fingerprint', 3], ['Optical fingerprint', 5], ['Ultrasonic fingerprint', 11], ['IR face authentication kit', 20], ['Laptop fingerprint reader', 6]]),
    group('motion', 'Motion sensors', 'Sensors', [['Accelerometer only', 1], ['6-axis IMU', 3], ['9-axis sensor kit', 5], ['Fold angle sensor kit', 7]]),
    group('ambient', 'Ambient sensors', 'Sensors', [['Ambient light sensor', 1], ['Ambient light and proximity', 2], ['Dual ambient light kit', 3], ['Ambient light and color sensor', 4]]),
    group('packaging', 'Retail packaging', 'Finishing', [['Slim recyclable box', 2], ['Standard retail box', 4], ['Premium retail box', 7], ['Laptop shipping box', 9]]),
    group('cable', 'Included cable', 'Finishing', [['None', 0, 'none'], ['USB 2.0 Type-C cable', 1.5], ['100 W Type-C cable', 3], ['240 W Type-C cable', 5], ['USB4 cable', 9]]),
    group('assembly', 'Assembly and test', 'Finishing', [['Phone assembly', 16], ['Flagship phone assembly', 22], ['Foldable assembly', 35], ['Tablet assembly', 24], ['Laptop assembly', 42]]),
];
// Configurable procurement scenarios, not a list of vendor orderable SKUs.
// Variant prices stay separate from all Interactive Leaks calibration datasets.
export const BOM_BASE_OPTION_COUNT = BOM_GROUPS.reduce((sum, item) => sum + item.options.length, 0);
function append(id: string, name: string, cost: number) {
    const target = BOM_GROUPS.find(g => g.id === id)!;
    const key = 'config-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (target.options.some(o => o.id === key))
        throw new Error('Duplicate BOM configuration');
    target.options.push({ id: key, name, cost: Math.round(cost * 100) / 100, basis: 'estimate', configured: true });
}
// A panel's reference price is at 1080p / 60 Hz; the existing BOM resolution
// and refresh controls apply the final panel scaling once.
for (const size of [5.8, 6.1, 6.3, 6.5, 6.7, 6.8, 7, 7.6, 8, 8.8, 10.5, 11, 12.4, 12.9, 13, 14, 15.6, 16, 17.3]) {
    for (const [technology, base] of [['IPS LCD', 22], ['LTPS OLED', 36], ['LTPO OLED', 49]] as const) {
        for (const brightness of [500, 800, 1200]) {
            for (const surface of ['Glossy', 'Anti-reflective']) {
                append('display', `${size}-inch ${technology} · ${brightness} nits · ${surface}`, base * (size / 6.5) ** 1.3 * (1 + (brightness - 500) / 2200) + (surface === 'Anti-reflective' ? 9 : 0));
            }
        }
    }
}
for (const [name, cost] of [
    ['Sony LYT-600', 17], ['Sony LYT-701', 26], ['Sony IMX586', 13], ['Sony IMX598', 15], ['Sony IMX682', 16], ['Sony IMX686', 17], ['Sony IMX709', 15], ['Sony IMX754', 14], ['Sony IMX758', 18], ['Sony IMX787', 22], ['Sony IMX800', 27], ['Sony IMX858', 21], ['Sony IMX888', 28],
    ['ISOCELL HP1', 31], ['ISOCELL HM2', 22], ['ISOCELL HM3', 26], ['ISOCELL GN1', 24], ['ISOCELL GN5', 22], ['ISOCELL JN1', 12], ['ISOCELL JN5', 18], ['OmniVision OV50E', 23], ['OmniVision OV50D', 19], ['OmniVision OV64B', 20], ['OmniVision OV48C', 29],
] as const)
    append('sensor', name, cost);
for (const [megapixels, format, cost] of [[12, '1/3', 7], [48, '1/2.55', 15], [50, '1/2.76', 17], [50, '1/2', 22], [50, '1/1.56', 29], [64, '1/2', 26], [108, '1/1.67', 33], [200, '1/1.4', 50]] as const) {
    for (const focal of [50, 70, 85, 100, 120, 135])
        for (const ois of [false, true])
            append('telephoto', `${megapixels} MP ${format}-inch · ${focal} mm · ${ois ? 'OIS' : 'fixed stabilization'}`, cost + (focal >= 85 ? 14 : 5) + (ois ? 8 : 0));
    for (const focal of [12, 13, 14, 15, 16])
        for (const autofocus of [false, true])
            append('ultrawide', `${megapixels} MP ${format}-inch · ${focal} mm · ${autofocus ? 'autofocus' : 'fixed focus'}`, cost + 3 + (autofocus ? 5 : 0));
}
for (const mp of [5, 8, 12, 16, 24, 32, 50])
    for (const fov of [75, 85, 100])
        for (const af of [false, true])
            append('frontCamera', `${mp} MP front module · ${fov}° · ${af ? 'autofocus' : 'fixed focus'}`, 2 + mp * .18 + (af ? 4 : 0) + (fov - 75) * .05);
for (const elements of [5, 6, 7, 8])
    for (const aperture of [1.4, 1.6, 1.8, 2, 2.2])
        for (const stabilization of ['Fixed', 'OIS', 'Sensor-shift'])
            append('lens', `${elements}P lens · f/${aperture} · ${stabilization}`, 3 + (elements - 5) * 3 + (2.2 - aperture) * 5 + (stabilization === 'OIS' ? 7 : stabilization === 'Sensor-shift' ? 15 : 0));
for (const [technology, base, capacities, speeds] of [
    ['LPDDR4X', 2, [4, 6, 8, 12, 16], [3200, 3733, 4266]],
    ['LPDDR5', 2.4, [8, 12, 16, 24, 32], [5500, 6000, 6400]],
    ['LPDDR5X', 2.8, [8, 12, 16, 24, 32, 48, 64], [7500, 8533, 9600]],
    ['DDR5 SO-DIMM', 2.2, [8, 16, 24, 32, 48, 64, 96], [4800, 5600, 6400]],
] as const)
    for (const capacity of capacities)
        for (const speed of speeds)
            append('ram', `${capacity} GB ${technology} · ${speed} MT/s`, capacity * base * (1 + (speed - speeds[0]) / 20000));
for (const capacity of [128, 256, 512, 1024, 2048, 4096])
    for (const [tech, base] of [['UFS 3.1', .07], ['UFS 4.0', .09], ['NVMe Gen 4', .055], ['NVMe Gen 5', .085]] as const)
        for (const grade of ['TLC', 'QLC'])
            append('storage', `${capacity >= 1024 ? capacity / 1024 + ' TB' : capacity + ' GB'} ${tech} · ${grade}`, 5 + capacity * base * (grade === 'QLC' ? .8 : 1));
for (const capacity of [3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000, 12000, 14000, 16000, 18000])
    for (const [chemistry, rate] of [['Li-ion', .002], ['Silicon-carbon', .0029], ['High-density silicon-carbon', .0035]] as const)
        for (const cells of [1, 2, 3, 4])
            append('battery', `${capacity} mAh pack · ${chemistry} · ${cells} ${cells === 1 ? 'cell' : 'cells'}`, 3 + capacity * rate + cells * 1.8);
for (const wh of [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99])
    for (const cells of [3, 4, 6])
        append('battery', `${wh} Wh laptop pack · ${cells} cells`, 8 + wh * .62 + cells * 1.3);
for (const area of [500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000])
    for (const thickness of [.2, .3, .4, .5])
        append('cooling', `Vapor chamber · ${area} mm² · ${thickness} mm`, 2 + area * .00095 + thickness * 5);
export const BOM_OPTION_COUNT = BOM_GROUPS.reduce((sum, item) => sum + item.options.length, 0);
export const BOM_ADDED_CONFIGURATION_COUNT = BOM_OPTION_COUNT - BOM_BASE_OPTION_COUNT;
