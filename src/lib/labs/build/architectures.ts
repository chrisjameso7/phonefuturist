/**
 * Build a Phone — slots and representative architectures.
 *
 * A slot is a position in the phone that takes one component. An architecture
 * is a generic internal arrangement. These are representative layouts for
 * exploring how phones are put together; none is a teardown of a real device.
 */
import { componentsOfKind } from './catalog';
import type { AssemblyStep, InterfaceType, Mount, SlotConnection, SlotDefinition, Subsystem } from './schema';

type Conn = [to: string, iface: InterfaceType, description: string, via?: string];
type Row = [id: string, kind: string, label: string, subsystem: Subsystem, step: AssemblyStep, mount: Mount, required: boolean, layer: number, location: string, connections?: Conn[], extra?: Partial<Pick<SlotDefinition, 'options' | 'initial' | 'zone'>>];
const none = { initial: null };

const rows: Row[] = [
  // 1 · Chassis and structural frame
  ['frame', 'frame', 'Structural frame', 'mechanical', 1, 'structure', true, 0, 'The outer perimeter of the phone.', [['midplate', 'mechanical', 'Joined to the midframe plate.'], ['rear-cover', 'mechanical', 'Carries the rear cover on an adhesive ledge.']]],
  ['midplate', 'midplate', 'Midframe plate', 'mechanical', 1, 'structure', true, 0, 'Spans the inside of the frame, behind the display.', [['frame', 'mechanical', 'Joined to the frame around its edge.'], ['pcb', 'mechanical', 'The logic board is screwed to it.', 'screws']]],
  ['seals', 'seals', 'Gaskets and seals', 'mechanical', 1, 'structure', false, 1, 'Around the port, SIM tray and button openings in the frame.', [['frame', 'mechanical', 'Seated in the frame openings.']]],
  // 2 · Display assembly
  ['display-support', 'display-support', 'Display support layer', 'display', 2, 'layer', false, -1, 'Directly in front of the midframe plate.', [['midplate', 'thermal-contact', 'Rests against the midframe plate.']]],
  ['backplane', 'backplane', 'Display backplane', 'display', 2, 'layer', true, -2, 'The rear layer of the display panel.', [['panel', 'mechanical', 'Built into the panel substrate.']]],
  ['panel', 'panel', 'Display panel', 'display', 2, 'layer', true, -3, 'Fills the front of the phone behind the cover glass.', [['ddic', 'mipi-dsi', 'Driven by the display driver IC on the panel tail.'], ['pcb', 'mipi-dsi', 'Image stream from the processor.', 'display-flex']]],
  ['ddic', 'ddic', 'Display driver IC', 'display', 2, 'layer', true, -3, 'On the folded tail at the bottom edge of the panel.', [['panel', 'mipi-dsi', 'Drives the pixel rows and columns.'], ['soc', 'mipi-dsi', 'Receives the image stream.', 'display-flex']]],
  ['display-flex', 'display-flex', 'Display flex cable', 'display', 2, 'layer', true, -1, 'Folded behind the lower part of the panel, passing through a slot in the midframe.', [['panel', 'mipi-dsi', 'Bonded to the panel tail.'], ['pcb', 'board-to-board', 'Plugs into the logic board.', 'fpc-connectors']]],
  ['polarizer', 'polarizer', 'Polarizer', 'display', 2, 'layer', false, -4, 'Laminated to the front of the panel.', [['panel', 'mechanical', 'Laminated to the panel.']]],
  ['touch-layer', 'touch-layer', 'Touch digitizer', 'display', 2, 'layer', true, -5, 'Between the panel and the cover glass.', [['pcb', 'i2c', 'Touch controller signals share the display flex.', 'display-flex']]],
  ['display-adhesive', 'display-adhesive', 'Display adhesive', 'display', 2, 'layer', false, -6, 'A frame of adhesive on the front ledge of the chassis.', [['frame', 'mechanical', 'Bonds the display assembly to the frame.']]],
  ['cover-glass', 'cover-glass', 'Cover glass', 'display', 2, 'layer', true, -7, 'The front surface of the phone.', [['panel', 'mechanical', 'Laminated to the display stack with optical adhesive.']]],
  // 3 · Motherboard
  ['pcb', 'pcb', 'Logic board', 'processing', 3, 'bay', true, 3, 'Across the upper part of the phone, behind the midframe.', [['midplate', 'mechanical', 'Screwed to the midframe.', 'screws'], ['daughterboard', 'board-to-board', 'Linked to the charging daughterboard.', 'main-flex'], ['battery', 'battery-power', 'Receives battery power.', 'battery-pcm']]],
  ['sim-reader', 'sim-reader', 'SIM reader', 'interconnect', 3, 'board', false, 4, 'On the logic board, next to the tray opening in the frame.', [['sim-tray', 'spring-contact', 'Contacts the card held in the tray.'], ['soc', 'spi', 'Card interface to the modem.']], { zone: 'misc' }],
  ['fpc-connectors', 'fpc-connectors', 'Board-to-board connectors', 'interconnect', 3, 'instanced', true, 4, 'Along the edges of the logic board where the flex cables land.', [['pcb', 'board-to-board', 'Soldered to the logic board.']]],
  ['clock', 'clock', 'Clock generators', 'processing', 3, 'board', true, 4, 'On the logic board near the radios.', [['soc', 'i2c', 'Reference clocks for the processor and radios.']], { zone: 'misc' }],
  ['passive-capacitors', 'passive-capacitors', 'Capacitors', 'processing', 3, 'instanced', true, 4, 'Clustered around the processor and power chips.', [['pmic', 'battery-power', 'Decouple the supply rails.']]],
  ['passive-resistors', 'passive-resistors', 'Resistors', 'processing', 3, 'instanced', true, 4, 'Scattered across the logic board.', [['pcb', 'mechanical', 'Soldered to the logic board.']]],
  ['passive-inductors', 'passive-inductors', 'Inductors', 'processing', 3, 'instanced', true, 4, 'Beside the power-management chip.', [['pmic', 'battery-power', 'Energy storage for the switching regulators.']]],
  // 4 · Processor and memory
  ['soc', 'soc', 'Application processor', 'processing', 4, 'board', true, 4, 'On the logic board, under the processor shield.', [['ram', 'lpddr5x', 'Memory bus to the package stacked on top.'], ['storage', 'ufs-4.0', 'Storage link.'], ['pmic', 'i2c', 'Power rails and sequencing.'], ['panel', 'mipi-dsi', 'Image stream to the display.', 'display-flex'], ['camera-main', 'mipi-csi', 'Image data from the cameras.']], { zone: 'compute' }],
  ['ram', 'ram', 'Memory', 'processing', 4, 'board', true, 5, 'Stacked directly on top of the application processor.', [['soc', 'lpddr5x', 'Package-on-package connection to the processor.']], { zone: 'compute', initial: 'ram-12-lpddr5x' }],
  ['storage', 'storage', 'Storage', 'processing', 4, 'board', true, 4, 'On the logic board beside the processor.', [['soc', 'ufs-4.0', 'Storage link to the processor.']], { zone: 'compute', initial: 'ufs-256-4.0' }],
  ['pmic', 'pmic', 'Power-management IC', 'processing', 4, 'board', true, 4, 'On the logic board beside the processor.', [['battery', 'battery-power', 'Supplied from the battery rail.'], ['soc', 'i2c', 'Feeds the processor rails.']], { zone: 'compute' }],
  ['secure-element', 'secure-element', 'Security processor', 'processing', 4, 'board', false, 4, 'On the logic board.', [['soc', 'spi', 'Isolated link to the processor.']], { zone: 'misc' }],
  ['shield-compute', 'shield', 'Processor shield', 'processing', 4, 'board', false, 6, 'Soldered over the processor, memory, storage and power chips.', [['pcb', 'mechanical', 'Soldered to a fence on the logic board.'], ['tim', 'thermal-contact', 'Passes processor heat upward.']], { options: ['shield-compute'] }],
  // 5 · Camera modules
  ['camera-main', 'camera-main', 'Main camera', 'camera', 5, 'camera', true, 7, 'Behind the first rear lens opening.', [['soc', 'mipi-csi', 'Image data to the processor.', 'fpc-connectors'], ['camera-housing', 'mechanical', 'Aligned to its lens window.']], { initial: 'cam-main-1-1.3' }],
  ['camera-ultrawide', 'camera-ultrawide', 'Ultrawide camera', 'camera', 5, 'camera', false, 7, 'Behind the second rear lens opening.', [['soc', 'mipi-csi', 'Image data to the processor.', 'fpc-connectors']]],
  ['camera-tele', 'camera-tele', 'Telephoto camera', 'camera', 5, 'camera', false, 7, 'Behind the third rear lens opening.', [['soc', 'mipi-csi', 'Image data to the processor.', 'fpc-connectors']]],
  ['camera-tele-2', 'camera-tele', 'Second telephoto camera', 'camera', 5, 'camera', false, 7, 'Behind the fourth rear lens opening.', [['soc', 'mipi-csi', 'Image data to the processor.', 'fpc-connectors']]],
  ['camera-front', 'camera-front', 'Front camera', 'camera', 5, 'bay', false, 2, 'At the top of the phone, behind the display opening.', [['soc', 'mipi-csi', 'Image data to the processor.', 'fpc-connectors']]],
  ['flash', 'flash', 'LED flash', 'camera', 5, 'rear', false, 8, 'Under the rear cover beside the cameras.', [['pmic', 'i2c', 'Driven by the flash driver.']]],
  // 6 · Battery
  ['battery-insulation', 'battery-insulation', 'Battery insulation', 'power', 6, 'bay', false, 2, 'Lining the floor of the battery bay.', [['midplate', 'mechanical', 'Adhered to the midframe.']]],
  ['battery', 'battery', 'Battery', 'power', 6, 'bay', true, 3, 'Fills the bay below the logic board.', [['battery-pcm', 'battery-power', 'Welded tabs to the protection board.'], ['pcb', 'battery-power', 'Supplies the logic board.', 'battery-pcm']], { initial: 'cell-5000' }],
  ['battery-pcm', 'battery-pcm', 'Battery protection and fuel gauge', 'power', 6, 'bay', true, 3, 'Along the top edge of the battery.', [['battery', 'battery-power', 'Welded to the cell tabs.'], ['pcb', 'board-to-board', 'Battery connector on the logic board.', 'fpc-connectors'], ['pmic', 'i2c', 'Reports charge level and temperature.']]],
  ['charging-ic', 'charging-ic', 'Charging controller', 'power', 6, 'board', true, 4, 'On the logic board near the battery connector.', [['usb-port', 'vbus', 'Charging power from the port.', 'main-flex'], ['battery', 'battery-power', 'Regulated charge current.', 'battery-pcm']], { zone: 'compute', initial: 'charger-65' }],
  ['wireless-coil', 'wireless-coil', 'Wireless charging coil', 'power', 6, 'rear', false, 8, 'Under the rear cover, centred over the battery.', [['charging-ic', 'battery-power', 'Rectified power to the charger.'], ['rear-cover', 'mechanical', 'Couples through the rear cover.']], { initial: 'coil-15' }],
  // 7 · Thermal management
  ['vapor-chamber', 'vapor-chamber', 'Vapor chamber', 'thermal', 7, 'layer', false, 1, 'Set into the midframe under the logic board and battery.', [['midplate', 'thermal-contact', 'Seated in a midframe pocket.'], ['soc', 'thermal-contact', 'Takes heat from the processor area.', 'tim']], { initial: 'vc-large' }],
  ['tim', 'tim', 'Thermal interface', 'thermal', 7, 'board', false, 7, 'On top of the processor shield.', [['shield-compute', 'thermal-contact', 'Bridges the shield to the heat spreader.'], ['heat-spreader', 'thermal-contact', 'Passes heat into the spreader.']]],
  ['heat-spreader', 'heat-spreader', 'Heat spreader', 'thermal', 7, 'bay', false, 8, 'Over the processor shield.', [['tim', 'thermal-contact', 'Collects heat from the thermal interface.'], ['graphite', 'thermal-contact', 'Hands heat to the rear graphite sheet.']]],
  ['graphite', 'graphite', 'Graphite sheet', 'thermal', 7, 'rear', false, 10, 'On the inside face of the rear cover.', [['rear-cover', 'thermal-contact', 'Spreads heat across the rear cover.']]],
  ['temp-sensors', 'temp-sensors', 'Temperature sensors', 'thermal', 7, 'instanced', true, 4, 'Beside the processor, the charger and the battery connector.', [['pmic', 'i2c', 'Read by the power-management chip.']]],
  // 8 · Connectivity hardware
  ['rf-transceiver', 'rf-transceiver', 'RF transceiver', 'connectivity', 8, 'board', true, 4, 'On the logic board, under the RF shield.', [['soc', 'spi', 'Baseband data from the modem.'], ['pa-module', 'rf-feed', 'Transmit signal to the amplifier.']], { zone: 'rf' }],
  ['pa-module', 'pa-module', 'Power-amplifier module', 'connectivity', 8, 'board', true, 4, 'On the logic board, under the RF shield.', [['rf-filters', 'rf-feed', 'Through the band filters.'], ['antenna-cell-top', 'rf-feed', 'Feeds the upper antenna.'], ['antenna-cell-bottom', 'rf-coax', 'Feeds the lower antenna.', 'coax']], { zone: 'rf', initial: 'pa-5g-sub6' }],
  ['rf-filters', 'rf-filters', 'Filters and duplexers', 'connectivity', 8, 'board', true, 4, 'On the logic board between the amplifiers and the switch.', [['rf-switch', 'rf-feed', 'Filtered signal to the antenna switch.']], { zone: 'rf' }],
  ['rf-switch', 'rf-switch', 'Antenna switch', 'connectivity', 8, 'board', true, 4, 'On the logic board at the start of the antenna feeds.', [['antenna-cell-top', 'rf-feed', 'Selects the upper antenna.'], ['antenna-cell-bottom', 'rf-coax', 'Selects the lower antenna.', 'coax']], { zone: 'rf' }],
  ['lna', 'lna', 'Low-noise amplifier', 'connectivity', 8, 'board', true, 4, 'On the logic board close to the antenna feed.', [['rf-transceiver', 'rf-feed', 'Amplified receive signal.']], { zone: 'rf' }],
  ['modem', 'modem', 'Discrete modem', 'processing', 8, 'board', false, 4, 'On the logic board beside the RF section.', [['soc', 'pcie', 'Data link to the processor.'], ['rf-transceiver', 'rf-feed', 'Baseband to the transceiver.']], { zone: 'rf', ...none }],
  ['wifi-bt', 'wifi-bt', 'Wi-Fi and Bluetooth', 'connectivity', 8, 'board', false, 4, 'On the logic board near a top corner.', [['soc', 'pcie', 'Data link to the processor.'], ['antenna-wifi', 'rf-feed', 'Feeds the Wi-Fi antenna.']], { zone: 'rf', initial: 'wifi-6e' }],
  ['gnss', 'gnss', 'GNSS receiver', 'connectivity', 8, 'board', false, 4, 'On the logic board near the top edge.', [['antenna-gnss', 'rf-feed', 'Receives from the GNSS antenna.'], ['soc', 'spi', 'Position data to the processor.']], { zone: 'rf' }],
  ['nfc', 'nfc', 'NFC controller', 'connectivity', 8, 'board', false, 4, 'On the logic board.', [['antenna-nfc', 'rf-feed', 'Drives the NFC loop.'], ['secure-element', 'spi', 'Payment credentials.']], { zone: 'rf' }],
  ['shield-rf', 'shield', 'RF shield', 'connectivity', 8, 'board', false, 6, 'Soldered over the radio chips.', [['pcb', 'mechanical', 'Soldered to a fence on the logic board.']], { options: ['shield-rf'] }],
  ['antenna-cell-top', 'antenna-cell-top', 'Upper cellular antenna', 'connectivity', 8, 'edge', true, 2, 'Along the inside of the top edge.', [['rf-switch', 'rf-feed', 'Spring contacts to the logic board.']]],
  ['antenna-cell-bottom', 'antenna-cell-bottom', 'Lower cellular antenna', 'connectivity', 8, 'edge', true, 2, 'Along the inside of the bottom edge.', [['rf-switch', 'rf-coax', 'Fed over the coaxial cable.', 'coax'], ['daughterboard', 'spring-contact', 'Spring contacts on the daughterboard.']]],
  ['antenna-wifi', 'antenna-wifi', 'Wi-Fi antenna', 'connectivity', 8, 'edge', false, 2, 'Inside a top corner.', [['wifi-bt', 'rf-feed', 'Spring contacts to the logic board.']]],
  ['antenna-gnss', 'antenna-gnss', 'GNSS antenna', 'connectivity', 8, 'edge', false, 2, 'Inside the top edge.', [['gnss', 'rf-feed', 'Spring contacts to the logic board.']]],
  ['antenna-nfc', 'antenna-nfc', 'NFC antenna', 'connectivity', 8, 'rear', false, 9, 'Under the rear cover near the cameras.', [['nfc', 'rf-feed', 'Spring contacts to the logic board.'], ['rear-cover', 'mechanical', 'Couples through the rear cover.']]],
  ['antenna-mmwave', 'antenna-mmwave', 'Millimetre-wave antennas', 'connectivity', 8, 'edge', false, 2, 'Against the side edges of the frame.', [['pa-module', 'rf-feed', 'Intermediate-frequency link to the front-end.']], none],
  ['coax', 'coax', 'Coaxial cable', 'connectivity', 8, 'bay', true, 5, 'Running down the side of the battery.', [['pcb', 'rf-coax', 'Snaps onto the logic board.'], ['daughterboard', 'rf-coax', 'Snaps onto the daughterboard.']]],
  // 9 · Audio components
  ['loudspeaker', 'loudspeaker', 'Loudspeaker', 'audio', 9, 'bay', false, 3, 'At the bottom of the phone beside the port.', [['audio-amp', 'spring-contact', 'Driven by the speaker amplifier.', 'main-flex']]],
  ['earpiece', 'earpiece', 'Earpiece speaker', 'audio', 9, 'bay', false, 2, 'At the top edge, behind the display.', [['audio-amp', 'spring-contact', 'Driven from the logic board.']]],
  ['mic-bottom', 'microphone', 'Lower microphone', 'audio', 9, 'bay', true, 4, 'On the daughterboard beside the port.', [['audio-codec', 'i2s', 'Digital audio over the main flex.', 'main-flex']]],
  ['mic-top', 'microphone', 'Upper microphone', 'audio', 9, 'bay', false, 4, 'On the logic board at the top edge.', [['audio-codec', 'i2s', 'Digital audio to the codec.']]],
  ['mic-rear', 'microphone', 'Rear microphone', 'audio', 9, 'bay', false, 6, 'On the logic board beside the cameras.', [['audio-codec', 'i2s', 'Digital audio to the codec.']]],
  ['audio-codec', 'audio-codec', 'Audio codec', 'processing', 9, 'board', true, 4, 'On the logic board.', [['soc', 'i2s', 'Digital audio to the processor.']], { zone: 'misc' }],
  ['audio-amp', 'audio-amp', 'Speaker amplifier', 'audio', 9, 'board', false, 4, 'On the logic board.', [['audio-codec', 'i2s', 'Digital audio in.'], ['loudspeaker', 'spring-contact', 'Amplified audio out.', 'main-flex']], { zone: 'misc' }],
  ['haptic', 'haptic', 'Haptic actuator', 'audio', 9, 'bay', false, 3, 'At the bottom of the phone, opposite the loudspeaker.', [['daughterboard', 'spring-contact', 'Driven from the daughterboard.']]],
  // 10 · Sensors and biometrics
  ['imu', 'imu', 'Accelerometer and gyroscope', 'sensors', 10, 'board', true, 4, 'On the logic board.', [['soc', 'spi', 'Motion data to the processor.']], { zone: 'misc' }],
  ['magnetometer', 'magnetometer', 'Magnetometer', 'sensors', 10, 'board', false, 4, 'On the logic board, away from magnets.', [['soc', 'i2c', 'Heading data to the processor.']], { zone: 'misc' }],
  ['barometer', 'barometer', 'Barometer', 'sensors', 10, 'board', false, 4, 'On the logic board near a vent.', [['soc', 'i2c', 'Pressure data to the processor.']], { zone: 'misc' }],
  ['hall', 'hall', 'Hall-effect sensor', 'sensors', 10, 'board', false, 4, 'On the logic board.', [['soc', 'i2c', 'Cover state to the processor.']], { zone: 'misc' }],
  ['prox-als', 'prox-als', 'Proximity and light sensor', 'sensors', 10, 'bay', false, 2, 'At the top edge, behind the display.', [['soc', 'i2c', 'Readings to the processor.']]],
  ['fingerprint', 'fingerprint', 'Fingerprint reader', 'sensors', 10, 'bay', false, 1, 'Depends on the reader type.', [['secure-element', 'spi', 'Encrypted link to the security processor.']], { initial: 'fp-ultrasonic' }],
  ['face-ir', 'face-ir', 'Infrared face recognition', 'sensors', 10, 'bay', false, 2, 'Across the top edge, behind the display.', [['soc', 'mipi-csi', 'Depth data to the processor.'], ['secure-element', 'spi', 'Template matching.']], none],
  // 11 · Buttons, ports and connectors
  ['daughterboard', 'daughterboard', 'Charging daughterboard', 'interconnect', 11, 'bay', true, 3, 'Across the bottom edge.', [['pcb', 'board-to-board', 'Linked to the logic board.', 'main-flex'], ['usb-port', 'vbus', 'Carries the port.']], { initial: 'daughter-usb3' }],
  ['usb-port', 'usb-port', 'USB-C port', 'interconnect', 11, 'bay', false, 4, 'Centre of the bottom edge.', [['daughterboard', 'usb-3.2', 'Soldered to the daughterboard.'], ['charging-ic', 'vbus', 'Charging power.', 'main-flex']]],
  ['main-flex', 'main-flex', 'Main interconnect flex', 'interconnect', 11, 'bay', true, 6, 'Lying over the battery, top to bottom.', [['pcb', 'board-to-board', 'Plugs into the logic board.', 'fpc-connectors'], ['daughterboard', 'board-to-board', 'Plugs into the daughterboard.']]],
  ['button-flex', 'button-flex', 'Button flex', 'interconnect', 11, 'edge', false, 2, 'Along the inside of the side frame.', [['pcb', 'board-to-board', 'Plugs into the logic board.', 'fpc-connectors'], ['buttons', 'mechanical', 'Dome switches under the keys.']]],
  ['buttons', 'buttons', 'Buttons', 'mechanical', 11, 'edge', false, 1, 'Through the side frame.', [['button-flex', 'mechanical', 'Press the dome switches.']]],
  ['sim-tray', 'sim-tray', 'SIM tray', 'mechanical', 11, 'edge', false, 1, 'Through the side frame.', [['sim-reader', 'spring-contact', 'Slides into the reader.']]],
  ['brackets', 'brackets', 'Connector brackets', 'mechanical', 11, 'instanced', false, 7, 'Screwed over the flex connectors.', [['fpc-connectors', 'mechanical', 'Hold the connectors down.']]],
  ['screws', 'screws', 'Screws', 'mechanical', 11, 'instanced', false, 8, 'At the logic board, daughterboard and bracket corners.', [['midplate', 'mechanical', 'Thread into the midframe.']]],
  // 12 · Rear cover
  ['rear-adhesive', 'rear-adhesive', 'Rear cover adhesive', 'mechanical', 12, 'rear', false, 11, 'On the rear ledge of the frame.', [['frame', 'mechanical', 'Bonds the rear cover to the frame.']]],
  ['rear-cover', 'rear-cover', 'Rear cover', 'mechanical', 12, 'structure', true, 12, 'The back of the phone.', [['frame', 'mechanical', 'Bonded to the frame.', 'rear-adhesive']]],
  ['camera-housing', 'camera-housing', 'Camera housing', 'mechanical', 12, 'structure', false, 13, 'Raised from the rear cover around the lenses.', [['rear-cover', 'mechanical', 'Fixed to the rear cover.'], ['camera-main', 'mechanical', 'Lens windows over the modules.']]],
];

export const SLOTS: SlotDefinition[] = rows.map(([id, kind, label, subsystem, step, mount, required, layer, location, connections, extra]) => {
  const options = extra?.options ?? componentsOfKind(kind).map(c => c.id);
  return { id, kind, label, subsystem, step, mount, required, layer, location, options, initial: extra?.initial, zone: extra?.zone,
    connections: (connections ?? []).map(([to, iface, description, via]): SlotConnection => ({ to, interface: iface, description, via })) };
});
export const SLOT_BY_ID: Record<string, SlotDefinition> = Object.fromEntries(SLOTS.map(s => [s.id, s]));

export type Architecture = {
  id: string; name: string; summary: string;
  /** Layout family used by the placement solver. */
  layout: 'band' | 'rail';
  /** Share of the interior height taken by the logic board band. */
  boardShare: number;
  /** Default component overrides for this arrangement. */
  defaults: Record<string, string | null>;
  /** Slots this arrangement does not have. */
  omit: string[];
};
export const ARCHITECTURES: Record<string, Architecture> = {
  classic: { id: 'classic', name: 'Single-board layout', layout: 'band', boardShare: .32,
    summary: 'One logic board across the top, a full-width battery below it and a daughterboard at the bottom. The most common arrangement.',
    defaults: { pcb: 'pcb-10l-hdi' }, omit: [] },
  stacked: { id: 'stacked', name: 'Stacked-board layout', layout: 'band', boardShare: .26,
    summary: 'Two boards soldered face to face shrink the logic board footprint, leaving more length for the battery. Used where camera and battery space are both tight.',
    defaults: { pcb: 'pcb-12l-stacked', battery: 'cell-5500-sic', 'camera-tele': 'cam-tele-peri-5x', soc: 'ap-flagship', 'vapor-chamber': 'vc-large' }, omit: [] },
  rail: { id: 'rail', name: 'Side-rail layout', layout: 'rail', boardShare: .2,
    summary: 'An L-shaped board runs down one side beside a narrow battery. It shortens the path from the processor to the port and leaves room for a long vapor chamber.',
    defaults: { pcb: 'pcb-10l-hdi', battery: 'cell-4500-narrow', 'vapor-chamber': 'vc-stacked', 'wireless-coil': null, haptic: 'haptic-large', 'charging-ic': 'charger-100' }, omit: [] },
};
export const DEFAULT_ARCHITECTURE = 'classic';
