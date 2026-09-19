\# PhoneFuturist Interactive Leaks

\## Calibration Architecture \& Measurement Standard



\*\*Status:\*\* Active development  

\*\*Related specification:\*\* `INTERACTIVE\_LEAKS\_SPEC.md`  

\*\*Initial target:\*\* Battery Experience v0.5 and Performance v0.6  

\*\*Document purpose:\*\* Define how Interactive Leaks collects, stores, evaluates, calibrates, validates, and uses real-world technical measurements.



\---



\# 1. Purpose



Interactive Leaks cannot produce credible modeled behavior from specifications alone.



Specifications describe what hardware exists.



Calibration describes how hardware behaves.



The calibration system connects:



\- published specifications

\- laboratory measurements

\- reviewer testing

\- component measurements

\- PhoneFuturist measurements

\- device-level validation

\- simulation models



Its purpose is to ensure that modeled outputs are derived from traceable evidence rather than arbitrary assumptions.



The fundamental pipeline is:



RAW MEASUREMENT



↓



NORMALIZED MEASUREMENT



↓



COMPONENT / SYSTEM CALIBRATION



↓



SIMULATION MODEL



↓



RELEASED-DEVICE VALIDATION



↓



UNRELEASED-DEVICE SIMULATION



The original measurement must always remain available.



A derived calibration value must never replace its source evidence.



\---



\# 2. Core Calibration Rule



A calibration value without its measurement conditions and provenance must never silently become ground truth.



A statement such as:



> Device X lasts 14 hours.



is incomplete.



Useful calibration evidence should answer, where available:



\- What device was tested?

\- Which hardware configuration?

\- Which software version?

\- What workload?

\- What display brightness?

\- What refresh mode?

\- What resolution?

\- What network?

\- What signal conditions?

\- What ambient temperature?

\- What battery state?

\- What duration?

\- What measurement equipment?

\- What methodology?

\- Who performed the measurement?

\- When was it performed?

\- Where is the original source?

\- Was the result measured directly or inferred?



Unknown test conditions must remain unknown.



They must not be reconstructed without evidence.



\---



\# 3. Calibration Philosophy



Interactive Leaks should avoid calibrating exclusively around complete phones.



Where technically possible, calibration should occur at the component or subsystem level.



Examples:



\## Display



Measure or model relationships between:



\- panel technology

\- panel generation

\- brightness

\- average picture level

\- refresh behavior

\- resolution

\- display power



\## Processor



Measure or model relationships between:



\- architecture

\- process node

\- frequency

\- workload

\- performance

\- power

\- efficiency



\## Connectivity



Measure or model relationships between:



\- modem

\- radio technology

\- signal strength

\- throughput

\- radio activity

\- power consumption



\## Thermal system



Measure or model relationships between:



\- heat generation

\- cooling hardware

\- chassis

\- ambient temperature

\- temperature

\- sustained power

\- sustained performance



\## Battery



Measure or model relationships between:



\- nominal energy

\- usable energy

\- discharge behavior

\- system power

\- runtime



Complete released devices should then be used to validate the combined model.



\---



\# 4. Why Device-Level Scaling Is Insufficient



Interactive Leaks should not primarily operate using logic such as:



> Phone A lasts 10 hours with 5000 mAh, therefore Phone B with 5500 mAh should last 11 hours.



This ignores changes in:



\- display efficiency

\- processor efficiency

\- modem behavior

\- memory

\- operating system

\- cooling

\- workload

\- battery voltage

\- usable energy

\- refresh behavior

\- brightness

\- radio conditions



Device-level results are valuable validation evidence.



They should not replace subsystem modeling.



\---



\# 5. Measurement Provenance



Every calibration measurement must preserve provenance.



Recommended measurement provenance:



\- `first\_party\_measurement`

\- `independent\_lab`

\- `reviewer\_measurement`

\- `manufacturer\_measurement`

\- `component\_vendor`

\- `academic`

\- `community\_measurement`

\- `reported`

\- `derived`



This describes where the measurement came from.



It is separate from simulation parameter provenance such as:



\- measured

\- confirmed

\- reported

\- modeled

\- user

\- estimated

\- unknown



\---



\# 6. Source Record



Every external calibration source should have a source record.



Recommended fields:



\- source ID

\- publisher

\- author

\- source title

\- publication date

\- source URL

\- source type

\- access date

\- notes



Where relevant:



\- methodology URL

\- dataset URL

\- device sample information

\- test equipment information



Sources must remain traceable.



If an external source disappears, stored calibration records should retain enough metadata to identify where the measurement originated.



Copyrighted material should not be unnecessarily duplicated.



Store technical facts and measurement metadata rather than copying entire articles.



\---



\# 7. Measurement Record



The measurement record is the fundamental unit of the calibration system.



Recommended conceptual structure:



```text

Measurement

├── identity

├── subject

├── metric

├── value / range

├── unit

├── conditions

├── provenance

├── source

├── methodology

├── uncertainty

├── notes

└── quality metadata

A measurement should represent one technically meaningful observation.

Examples:

\- display power at a particular brightness

\- Geekbench single-core result

\- sustained GPU performance after 20 minutes

\- battery runtime under a defined workload

\- surface temperature after a defined load

8\. Measurement Subject

A measurement may apply to:

\- complete device

\- SoC

\- CPU

\- GPU

\- display panel

\- modem

\- battery

\- camera sensor

\- cooling system

\- memory

\- storage

\- another component

The system should not assume every measurement describes a complete device.

9\. Measurement Values

Measurements may contain:

Exact value

Example:

4.8 W

Range

Example:

4.6–5.0 W

Multiple samples

Example:

\[4.7, 4.8, 4.9] W

Distribution

Potential future support for:

\- mean

\- median

\- standard deviation

\- percentile values

\- sample count

Do not manufacture uncertainty ranges where the source provides none.

An exact reported value does not necessarily mean the underlying physical behavior has zero uncertainty.

10\. Units

Calibration values should use normalized internal units.

Examples:

Power:

W

Energy:

Wh

Voltage:

V

Current:

A

Temperature:

°C

Time:

seconds

Distance:

mm

Area:

mm²

Volume:

mm³

Frequency:

Hz

Brightness:

nits / cd/m²

Illuminance:

lux

Performance metrics may retain benchmark-specific units or scores.

Original source units should be preserved where useful.

Conversions must be deterministic.

11\. Test Conditions

Test conditions must be structured wherever possible.

Avoid storing important conditions only as free text.

Potential fields include:

Environment

\- ambient temperature

\- humidity where relevant

\- airflow where relevant

Display

\- brightness

\- automatic/manual brightness

\- resolution

\- refresh mode

\- fixed refresh rate

\- adaptive refresh behavior

\- average picture level

\- HDR state

Connectivity

\- Wi-Fi

\- cellular

\- airplane mode

\- network generation

\- signal strength

\- throughput

\- modem activity

Device state

\- battery percentage

\- charging state

\- performance mode

\- power-saving mode

\- thermal state

\- background applications

Software

\- OS version

\- firmware/build

\- application version

\- benchmark version

Workload

\- workload type

\- duration

\- intensity

\- scripted actions

\- content used

Unknown conditions remain explicitly unknown.

12\. Workload Definitions

A workload must eventually have a standardized definition.

Examples:

\- web browsing

\- local video

\- streamed video

\- gaming

\- camera recording

\- idle

\- standby

\- navigation

\- benchmark

\- mixed use

A workload name alone is not enough for rigorous calibration.

For example:

web browsing

may eventually specify:

\- page set

\- interaction interval

\- network type

\- brightness

\- refresh behavior

\- browser

\- duration

PhoneFuturist should gradually establish canonical workloads.

13\. Canonical Test Profiles

Interactive Leaks should eventually define standard test profiles.

Example:

PF Web 1.0

Potential conditions:

\- 200-nit display

\- Wi-Fi

\- defined page rotation

\- adaptive refresh enabled

\- 25°C ambient

\- standardized browser workload

Example:

PF Video 1.0

Potential conditions:

\- 200-nit display

\- Wi-Fi or local playback as explicitly defined

\- defined codec

\- defined resolution

\- defined frame rate

\- 25°C ambient

Exact conditions must be established through testing and research.

Do not invent them merely to complete this document.

Version canonical profiles.

A future change should create:

PF Web 1.1

rather than silently changing PF Web 1.0.

14\. Normalization

Measurements from different sources may use different conditions.

Normalization may eventually allow compatible measurements to be compared.

However, normalization must be conservative.

Do not pretend measurements are directly comparable when major conditions differ.

Examples of potentially incompatible measurements:

\- 200 nits vs maximum brightness

\- Wi-Fi vs weak 5G

\- FHD vs QHD

\- 60 Hz vs adaptive 120 Hz

\- different benchmark versions

\- different game versions

\- different ambient temperatures

A normalized value must preserve:

\- original measurement

\- normalization method

\- normalization model version

\- assumptions

The normalized value must never overwrite the original.

15\. Measurement Compatibility

Before combining measurements, the system should evaluate whether their methodologies are sufficiently compatible.

Potential states:

\- compatible

\- partially compatible

\- incompatible

\- unknown

This should initially be rule-based.

Do not use arbitrary similarity percentages.

16\. Source Quality

Not every measurement source is equally useful.

However, source quality should not become a simplistic publication ranking.

Evaluate the measurement itself.

Potential quality considerations:

\- methodology disclosed

\- conditions disclosed

\- repeatability

\- equipment disclosed

\- multiple samples

\- raw data available

\- software version disclosed

\- device configuration disclosed

\- independent replication

A famous publication with an undocumented methodology may provide less useful calibration evidence than a smaller laboratory with rigorous measurements.

17\. Evidence Quality

Potential qualitative evidence states:

\- High

\- Medium

\- Low

\- Insufficient

These labels must have explanations.

Example:

High

\- direct measurement

\- methodology documented

\- conditions documented

\- multiple samples

\- independently replicated

Example:

Low

\- single reported value

\- test conditions incomplete

\- methodology unavailable

Do not convert these labels into fake statistical probabilities.

18\. Outliers

Calibration datasets must support disagreement.

Do not automatically delete measurements because they differ from others.

An outlier may indicate:

\- measurement error

\- sample variation

\- firmware differences

\- environmental differences

\- workload differences

\- thermal differences

\- hardware binning

\- genuine behavior

Outlier handling must be documented.

Original records must remain preserved even if excluded from a particular calibration.

19\. Replication

Independent replication increases confidence.

If multiple independent sources measure comparable behavior under sufficiently similar conditions, the calibration system may derive a stronger baseline.

The system should track:

\- number of compatible measurements

\- number of independent sources

\- measurement spread

\- known methodological differences

Do not count duplicated reporting of the same original measurement as independent replication.

20\. Derived Calibration Values

Simulation models may derive calibration parameters from raw measurements.

Examples:

\- display power curve

\- SoC power/performance curve

\- thermal decay coefficient

\- idle platform power range

Every derived calibration value must record:

\- source measurement IDs

\- derivation method

\- model version

\- creation date

\- assumptions

\- exclusions

Derived values must be reproducible from their source measurements where practical.

21\. Calibration Dataset Versioning

Calibration datasets must be versioned.

Example:

battery-calibration-1.0

display-calibration-1.2

performance-calibration-0.8

Published simulations should eventually record which calibration version was used.

Updating calibration data must not silently rewrite historical published results.

22\. Battery Calibration

Battery Experience requires more than battery capacity.

Useful battery calibration evidence may include:

\- nominal voltage

\- usable energy

\- discharge characteristics

\- device idle power

\- workload power

\- display power

\- compute power

\- modem power

\- platform power

\- measured runtime

Released-device runtime tests are important validation targets.

23\. Usable Battery Energy

Nominal battery energy and usable battery energy are not necessarily identical.

Conceptually:

nominal energy = capacity × nominal voltage

Simulation runtime should eventually use usable energy where credible data exists.

Usable-energy behavior may depend on:

\- battery chemistry

\- manufacturer limits

\- voltage window

\- power-management behavior

\- battery health

\- temperature

If usable energy is unknown, it must not be silently represented as measured.

A model may estimate usable energy only when the assumption is explicit and traceable.

24\. Battery Power Model

Conceptually:

P\_total = P\_display + P\_compute + P\_memory\_platform + P\_connectivity + P\_background + P\_workload\_specific

Not every subsystem must always be active.

The architecture should allow individual terms to be:

\- exact

\- ranged

\- modeled

\- unknown

Total power should propagate uncertainty rather than collapse everything into false precision.

25\. Battery Runtime

Conceptually:

runtime = usable\_energy / average\_power

For ranges:

minimum runtime = minimum usable energy / maximum power

maximum runtime = maximum usable energy / minimum power

Any implementation must carefully validate range propagation and units.

Battery runtime must never be derived from mAh alone.

26\. Battery Validation

A released device can validate the combined battery model.

Example process:

1\. Enter released-device configuration.

2\. Enter canonical test conditions.

3\. Run model.

4\. Compare predicted runtime with credible measured runtime.

5\. Record residual/error.

6\. Investigate model mismatch.

7\. Adjust calibration only when evidence justifies it.

8\. Revalidate across multiple devices.

Never tune a general model to make one specific phone match perfectly at the expense of broader accuracy.

27\. Performance Calibration

Performance calibration may include:

\- CPU benchmark results

\- GPU benchmark results

\- NPU results

\- frequency

\- power

\- efficiency

\- sustained performance

\- memory behavior

Benchmark version must be recorded.

Scores from different benchmark versions should not automatically be treated as directly comparable.

28\. Benchmark Calibration

A benchmark prediction model must be based on observed relationships.

Potential inputs may include:

\- architecture

\- IPC evidence

\- frequency

\- cache

\- memory

\- process technology

\- power limit

\- core configuration

Do not use clock speed alone.

Do not invent benchmark scores because a processor is described as a percentage faster in marketing.

If evidence only supports relative improvement, preserve it as relative evidence.

29\. Peak vs Sustained Performance

Peak performance and sustained performance are separate concepts.

Calibration should distinguish:

\- short benchmark burst

\- medium-duration load

\- long-duration sustained load

A device may have excellent peak performance and weaker sustained performance.

Interactive Leaks should eventually model both.

30\. Thermal Calibration

Thermal calibration may use:

\- SoC power

\- internal temperature

\- surface temperature

\- ambient temperature

\- cooling area

\- vapor chamber characteristics

\- chassis material

\- workload duration

\- sustained performance

Thermal modeling is inherently complex.

Early thermal models should expose limitations clearly rather than imply physical simulation accuracy beyond their evidence.

31\. Display Calibration

Useful display calibration may include:

\- panel technology

\- panel generation

\- brightness

\- APL

\- refresh rate

\- resolution

\- content type

\- display power

OLED power behavior depends strongly on displayed content.

A single "display wattage" should not automatically be treated as universal.

32\. Connectivity Calibration

Connectivity power may vary significantly with:

\- modem

\- network generation

\- frequency band

\- signal strength

\- throughput

\- upload/download activity

\- carrier/network behavior

A future model may distinguish:

\- Wi-Fi

\- strong LTE

\- weak LTE

\- strong 5G

\- weak 5G

These must be calibrated rather than assigned arbitrary penalties.

33\. Camera Calibration

Camera calibration may eventually include physical and measurable characteristics such as:

\- sensor dimensions

\- pixel dimensions

\- quantum efficiency where available

\- aperture

\- transmission

\- exposure

\- read noise

\- dynamic range

\- stabilization

\- resolution

Image-processing behavior is substantially harder to predict.

Manufacturer-specific computational photography should not be treated as known without evidence.

34\. Camera Reference Scenes

Future visual camera simulation should use controlled reference scenes.

A reference scene should have known or controlled characteristics where possible.

Potential scenarios:

\- daylight

\- indoor

\- low light

\- night

\- portrait

\- high dynamic range

\- motion

\- telephoto detail

The underlying scene must remain constant when comparing configurations.

35\. Camera Visualization Calibration

Visual transformations must be connected to supported model parameters.

Examples may include:

\- exposure

\- photon noise

\- read noise

\- blur

\- resolution

\- clipping

\- depth of field where appropriate

Do not manually make the "new phone" image prettier merely because it is supposed to be better.

A visualization must follow the model.

36\. Device Validation

Released devices should serve as validation cases.

A validation record should contain:

\- device configuration

\- model version

\- calibration version

\- test profile

\- predicted result

\- measured result

\- residual

\- date

\- notes

Validation data should not be hidden merely because the model performs poorly.

Model failures are useful engineering information.

37\. Validation Metrics

Different models require different validation metrics.

Potential metrics include:

\- absolute error

\- percentage error

\- mean absolute error

\- median absolute error

\- error distribution

The chosen metric must suit the model.

Do not display a global "accuracy percentage" without a defensible statistical definition.

38\. Training vs Validation Data

Where sufficient data exists, calibration data and validation data should be separated.

A model should not be considered validated merely because it reproduces the same measurements used to construct it.

Potential future split:

\- calibration/training dataset

\- validation dataset

\- holdout dataset

This becomes increasingly important as models become more sophisticated.

39\. Cross-Validation

When enough data exists, PhoneFuturist should use cross-validation or equivalent statistical validation techniques where appropriate.

This is especially relevant for models derived through regression or machine learning.

Interactive Leaks should not introduce machine learning merely because it sounds sophisticated.

Use the simplest model that adequately explains the evidence.

40\. Model Complexity

Model complexity should increase only when data supports it.

Prefer:

\- transparent equations

\- interpretable relationships

\- traceable coefficients

before:

\- opaque machine-learning systems

A more complicated model is not automatically more accurate.

Interpretability is especially valuable because users should be able to understand why a result changed.

41\. Parameter Resolution

A future simulation may resolve parameters from several sources.

Example priority may conceptually involve:

1\. explicit user override

2\. measured value selected for the simulation

3\. confirmed value

4\. selected reported value

5\. calibrated model

6\. explicit engineering estimate

7\. unknown

However, this must not become a universal blind precedence rule.

Context matters.

The final resolved value must preserve where it came from.

42\. Parameter Completeness

A simulation should eventually be able to summarize parameter completeness.

Example:

34 parameters resolved

\- 8 measured

\- 5 confirmed

\- 7 reported

\- 9 modeled

\- 3 user supplied

\- 2 estimated

4 unresolved

This is more informative than an arbitrary confidence percentage.

43\. Missing Data

Missing calibration information should produce one of three outcomes:

Non-essential

Simulation proceeds without the parameter.

Modelable

A documented calibrated model supplies a value or range.

Required

The result remains unresolved.

The system must explicitly identify which case applies.

44\. Assumptions

Assumptions must be first-class data.

An assumption should contain:

\- parameter

\- assumed value/range

\- reason

\- creator

\- provenance

\- date

\- affected models

Assumptions should be visible in published simulations.

45\. Sensitivity Analysis

Interactive Leaks should eventually identify which uncertain inputs have the greatest effect on a result.

Example:

Battery runtime uncertainty is primarily caused by:

1\. SoC workload power

2\. display efficiency

3\. modem behavior

This allows users to understand what future leaks or measurements would materially improve the simulation.

46\. Scenario Analysis

When evidence contains plausible alternatives, Interactive Leaks should support scenarios.

Example:

Scenario A

5500 mAh

Scenario B

5800 mAh

Instead of deciding which rumor is correct, the system can simulate both.

This is central to Interactive Leaks' philosophy.

47\. Calibration Updates

New evidence may improve calibration.

When calibration changes:

\- new simulations may use the updated calibration

\- historical published simulations remain reproducible

\- users may re-run historical configurations using the new calibration

The platform should eventually show differences between model generations.

Example:

Re-run with Battery Model 1.3



48\. Auditability

A technically advanced user should eventually be able to trace:

Result

↓

Model

↓

Calibration parameter

↓

Measurement

↓

Source

This chain is fundamental to trust.

Not every user needs to see it by default.

It should nevertheless exist.

49\. Data Storage Architecture

The exact database schema may evolve.

Conceptually, calibration data should eventually distinguish:

\- sources

\- measurements

\- test conditions

\- subjects/components

\- workloads

\- calibration datasets

\- derived parameters

\- model versions

\- validation runs

Avoid storing the entire calibration system as unstructured JSON if relational structure provides meaningful integrity.

JSON may still be appropriate for flexible condition metadata.

50\. Recommended Measurement Identity

Every measurement should have a stable unique identifier.

Example:

meas\_...

Derived calibration parameters should reference measurement IDs rather than only textual citations.

This allows:

\- deduplication

\- auditing

\- recalculation

\- source tracing

51\. Duplicate Measurements

The same measurement may be repeated across websites.

Do not treat republication as an independent measurement.

The system should eventually support:

\- original source

\- republications

\- derived reporting

Independent measurements must represent genuinely separate testing.

52\. Temporal Effects

Measurements may change over time because of:

\- firmware updates

\- OS updates

\- application updates

\- benchmark updates

\- driver updates

\- thermal-policy changes

Measurement date and software version matter.

Calibration should not assume that every result from a device is timeless.

53\. Hardware Revisions

Some devices may receive silent hardware revisions.

Where evidence exists, calibration should distinguish hardware revisions.

Do not assume every retail sample is identical when credible evidence indicates otherwise.

54\. Sample Variation

Physical devices vary.

Potential variation may come from:

\- silicon binning

\- battery variation

\- thermal interface variation

\- panel variation

\- manufacturing tolerances

A single measurement should not automatically define universal device behavior.

Ranges and multiple samples should be used where evidence permits.

55\. Manufacturer Claims

Manufacturer claims are useful evidence but should remain identifiable as manufacturer claims.

Examples:

\- efficiency improvement

\- performance improvement

\- battery runtime

\- brightness

\- charging speed

A manufacturer claim should not automatically be treated as an independent measurement.

56\. Leaked Measurements

Pre-release benchmark or test results may be stored as reported evidence.

They should not automatically enter the stable calibration dataset.

Possible problems include:

\- prototype hardware

\- unfinished firmware

\- spoofed devices

\- unknown test conditions

\- engineering modes

Leaked measurements may inform simulations while retaining their reported status.

57\. Community Measurements

Future community users may submit measurements.

Community measurements should not automatically enter trusted calibration.

Potential future process:

1\. submission

2\. methodology validation

3\. duplicate check

4\. evidence review

5\. acceptance/rejection

6\. calibration eligibility

The original submission may remain visible even if it is not calibration-grade.

58\. Calibration Administration

Calibration changes should require appropriate permissions.

Potential capabilities:

\- create source

\- add measurement

\- edit measurement

\- approve calibration inclusion

\- create calibration version

\- run validation

\- publish calibration version

Community simulation users should not be able to modify global PhoneFuturist calibration.

59\. Calibration Reproducibility

Given:

\- the same raw measurements

\- the same inclusion/exclusion rules

\- the same calibration algorithm

\- the same calibration model version

PhoneFuturist should be able to reproduce the same calibration dataset.

Manual undocumented coefficient tweaking should be avoided.

60\. Model Documentation

Every production simulation model should eventually document:

\- purpose

\- inputs

\- outputs

\- equations

\- calibration dataset

\- assumptions

\- limitations

\- validation results

\- model version

\- change history

This documentation may have internal and public versions.

61\. Model Limitations

Every model has boundaries.

Examples:

A battery model calibrated on smartphones may not automatically apply to tablets.

A thermal model calibrated on passive smartphones may not apply to actively cooled gaming phones.

A camera model calibrated for conventional Bayer sensors may not apply to radically different architectures.

The model must know when it is operating outside its validated domain.

62\. Extrapolation

Simulation of unreleased hardware inherently requires some extrapolation.

Extrapolation must be identifiable.

The farther a configuration moves beyond calibrated data, the lower the reliability of the result may become.

Example:

A processor only modestly beyond existing calibrated architectures may be easier to model than a completely new architecture with no measurements.

The system should eventually detect major extrapolation.

63\. Reliability Explanation

A modeled result should eventually explain its reliability.

Example:

Reliability: Medium

Supporting evidence:

\- battery energy is confirmed

\- display behavior is calibrated from related panels

\- processor power is modeled from architectural data

Major uncertainty:

\- modem power is unknown

\- final firmware behavior is unknown

This is more useful than:

Confidence: 72%



unless a statistically valid probability model exists.

64\. Cross-Subsystem Interaction

Subsystems cannot always be modeled independently.

Examples:

Higher display resolution may increase:

\- display power

\- GPU workload

\- memory bandwidth

Higher SoC power may increase:

\- temperature

\- throttling

\- battery consumption

Higher camera workload may increase:

\- ISP power

\- memory power

\- storage activity

\- display power

\- thermal load

Interactive Leaks should gradually support these interactions.

Avoid double-counting power when subsystem models overlap.

65\. Dependency Graph

The long-term simulation architecture should support explicit model dependencies.

Conceptually:

Display configuration

→ Display power

Processor configuration + workload

→ Compute power

Compute power + cooling + environment

→ Thermal state

Thermal state

→ Sustained performance

Display power + compute power + platform power + radio power

→ Total power

Total power + usable battery energy

→ Runtime

This graph should remain inspectable and deterministic.

66\. Avoiding Circular Models

Calibration must avoid circular reasoning.

Example of a bad calibration:

1\. infer SoC power entirely from phone runtime

2\. use inferred SoC power to predict the same phone's runtime

3\. claim the prediction validates the SoC model

Validation must use sufficiently independent evidence.

67\. Data Collection Priorities

Calibration work should prioritize parameters that most strongly affect user-facing simulations.

Initial priority:

1\. battery/runtime

2\. processor performance

3\. processor power/efficiency

4\. display power

5\. sustained performance/thermal behavior

6\. connectivity power

7\. camera physical characteristics

8\. camera visual calibration

Do not attempt to collect every imaginable technical measurement before shipping useful models.

68\. Initial Battery Dataset

Battery Experience v0.5 should begin conservatively.

The initial dataset should focus on released devices with:

\- reliable battery specifications

\- credible runtime testing

\- sufficiently documented test methodology

\- useful hardware diversity

The goal is not maximum device count.

The goal is high-quality calibration evidence.

A smaller clean dataset is preferable to a large inconsistent dataset.

69\. Initial Performance Dataset

Performance calibration should prioritize processors with:

\- multiple released devices

\- benchmark results

\- power data where available

\- sustained testing where available

\- known architecture

\- known process technology

This allows separation of processor behavior from individual-device cooling effects.

70\. Source Diversity

Avoid building calibration around a single publication.

Multiple independent sources reduce dependence on:

\- one methodology

\- one sample

\- one editorial process

\- one measurement error

However, measurements should only be combined when methodology permits.

Source diversity is not a substitute for compatibility.

71\. Data Collection Workflow

Recommended workflow:

1\. Identify calibration question.

2\. Define required metric.

3\. Define acceptable methodology.

4\. Collect sources.

5\. Record raw measurements.

6\. Record conditions.

7\. Normalize units.

8\. Assess compatibility.

9\. Flag missing conditions.

10\. Build calibration dataset.

11\. Derive model parameters.

12\. Validate against independent devices.

13\. Document limitations.

14\. Version calibration.

15\. release model.

72\. No Manual Cherry-Picking

Do not choose only measurements that make the model look accurate.

Exclusions require reasons.

Potential legitimate exclusion reasons:

\- incompatible methodology

\- corrupted data

\- incorrect device identification

\- invalid benchmark version

\- missing essential conditions

\- known measurement error

The exclusion reason should be recorded.

73\. Model Error

Model error should be treated as useful information.

If predicted results consistently differ from measurements, investigate:

\- missing subsystem

\- incorrect coefficient

\- invalid assumption

\- interaction effect

\- calibration bias

\- test incompatibility

Do not hide residual error through arbitrary adjustment factors.

74\. Safety Margins

Engineering safety margins may be appropriate in some future models.

If used, they must be:

\- explicit

\- justified

\- versioned

A hidden "make the result look realistic" multiplier is prohibited.

75\. Public Transparency

PhoneFuturist does not necessarily need to expose every internal calibration record publicly.

However, public simulation results should expose enough information for users to understand:

\- what was known

\- what was assumed

\- what was modeled

\- major sources of uncertainty

\- model version

Technical methodology pages should explain important models.

76\. Simulation Browser Integration

Published simulation records should eventually preserve:

\- engine version

\- model versions

\- calibration versions

This means two simulations can be compared not only by configuration but by modeling generation.

Example:

Simulation A:

Battery Model 1.1

Simulation B:

Battery Model 1.3

The browser should make that distinction visible where relevant.

77\. Re-running Historical Simulations

Historical simulations must remain unchanged.

A user may choose:

Re-run with latest models

The system creates a new simulation/revision.

This allows users to observe how better evidence changes expectations over time.

That is especially valuable for unreleased devices.

78\. Post-Release Validation

When a simulated device eventually launches, PhoneFuturist should be able to compare:

PRE-RELEASE SIMULATION

vs

RELEASED DEVICE MEASUREMENTS

This creates an unusually valuable feedback loop.

It allows PhoneFuturist to evaluate:

\- which reported specifications were correct

\- which assumptions were wrong

\- which models were accurate

\- which models need improvement

The launch of a device should therefore improve future simulations.

79\. Historical Accuracy

Interactive Leaks may eventually preserve pre-release simulation history.

Example:

Three months before launch:

Battery estimate 11–13 hours

One month before launch:

12–14 hours after new SoC information

Post-launch measured:

12.6 hours under comparable conditions

This creates a transparent record of how expectations evolved as evidence improved.

Do not rewrite old simulations to make historical predictions appear better.

80\. Calibration Success Criteria

The calibration system succeeds when:

\- measurements are traceable

\- conditions are preserved

\- models are reproducible

\- uncertainty is visible

\- model error is measurable

\- released devices can validate models

\- new evidence can improve models

\- historical simulations remain reproducible

\- users can understand why a modeled result exists

The objective is not to make Interactive Leaks appear certain.

The objective is to make uncertainty technically useful.

81\. Immediate Implementation Guidance

Battery Experience v0.5 should not wait for the complete future calibration database.

Its architecture should instead be compatible with it.

The initial implementation should support:

\- explicit power values

\- power ranges

\- provenance

\- usable energy

\- unresolved inputs

\- assumptions

\- workload identity

\- contributor breakdowns

Calibration datasets can then begin supplying those parameters.

Performance v0.6 should follow the same principle.

Do not hard-code temporary assumptions into core engine logic simply because the calibration database is not ready.

82\. Separation of Responsibilities

The system should preserve the following conceptual boundaries:

Intelligence

What is being claimed about a device?

Calibration

What measurements teach us how hardware behaves?

Simulation

What happens when the selected device configuration is processed through the model?

Validation

How closely does the model reproduce released hardware?

Presentation

How are results explained to users?

These systems interact.

They should not collapse into one database table or one monolithic engine module.

83\. Final Calibration Principle

Interactive Leaks should never ask users to trust a number merely because PhoneFuturist generated it.

The long-term standard should be:

Show what produced the result.



A credible simulation should be traceable from:

Result

to:

Model

to:

Calibration

to:

Measurement

to:

Source

while preserving the uncertainty introduced at every stage

