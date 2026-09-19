\# PhoneFuturist Interactive Leaks

\## Master Product \& Simulation Specification



\*\*Status:\*\* Active development  

\*\*Current stable engine:\*\* v0.4.0  

\*\*Stable checkpoint:\*\* `simulation-v0.4.0`  

\*\*Target feature freeze:\*\* October 10, 2026  

\*\*Document purpose:\*\* Source of truth for Interactive Leaks product, simulation, evidence, modeling, community, and implementation decisions.



\---



\# 1. Product Definition



Interactive Leaks is a virtual prototyping platform for unreleased, rumored, hypothetical, and upcoming consumer technology.



It is not primarily a specification calculator.



Its purpose is to answer:



> If these specifications, components, and reports are accurate, what kind of device could they produce?



Interactive Leaks converts hardware information, reported specifications, measured reference data, user assumptions, and calibrated PhoneFuturist models into interactive simulations of device behavior.



Users should eventually be able to:



1\. Build a hypothetical or unreleased device.

2\. Load a configuration based on reported information.

3\. Modify disputed or uncertain specifications.

4\. Simulate real-world behavior.

5\. Compare configurations.

6\. Compare an unreleased device with an existing generation.

7\. Inspect the assumptions behind every modeled result.

8\. Save a simulation.

9\. Publish a simulation.

10\. Share a simulation.

11\. Fork another person's simulation.

12\. Browse simulations created by PhoneFuturist and the community.



The long-term goal is for Interactive Leaks to function as a virtual prototype laboratory for consumer technology.



\---



\# 2. Core Product Principle



Interactive Leaks should not merely tell users what specifications mean mathematically.



It should demonstrate what those specifications could mean experientially.



Examples:



Instead of only:



\- 5800 mAh

\- 22.3 Wh



Interactive Leaks should eventually show:



\- estimated mixed-use battery life

\- web browsing runtime

\- video playback runtime

\- gaming runtime

\- standby behavior

\- a simulated day of use



Instead of only:



\- new processor

\- higher clock speed



Interactive Leaks should eventually show:



\- estimated benchmark ranges

\- peak performance

\- sustained performance

\- performance degradation over time

\- estimated efficiency

\- thermal behavior



Instead of only:



\- larger camera sensor

\- wider aperture



Interactive Leaks should eventually show:



\- modeled low-light differences

\- modeled detail differences

\- modeled noise differences

\- modeled exposure differences

\- controlled visual comparisons against another configuration



The system should answer:



> What could this hardware actually change?



\---



\# 3. Non-Negotiable Integrity Rules



These rules apply to every Interactive Leaks subsystem.



\## 3.1 Unknown means unknown



The simulator must never silently invent a missing value simply to produce a result.



If a calculation or model requires information that is unavailable, the result must:



\- remain unresolved, or

\- use an explicitly identified assumption chosen by the user or supplied by a documented model.



Missing information must never be disguised as known information.



\---



\## 3.2 Calculated and modeled results are different



Interactive Leaks must distinguish between:



\### Calculated



Outputs directly derived from known inputs using deterministic mathematics.



Examples:



\- battery Wh

\- pixel density

\- display dimensions

\- component volume

\- aspect ratio



\### Modeled



Outputs estimated using calibrated models, reference measurements, assumptions, or ranges.



Examples:



\- battery runtime

\- benchmark performance

\- sustained performance

\- thermal behavior

\- camera performance

\- display power consumption



The UI and stored simulation result must preserve this distinction.



\---



\## 3.3 No fake precision



Modeled results should use ranges whenever the available evidence does not justify an exact number.



Prefer:



> Estimated mixed-use runtime: 11.2–12.7 hours



over:



> Battery life: 11 hours 47 minutes



unless the model and evidence genuinely justify that precision.



\---



\## 3.4 No hidden AI estimation



Interactive Leaks must not rely on a generative AI model secretly inventing technical values.



Simulation results must come from:



\- deterministic calculations

\- documented models

\- calibration datasets

\- measured values

\- reported values

\- explicit user assumptions



AI may eventually help explain results in natural language, but it must not secretly determine the underlying simulation result.



\---



\## 3.5 Reproducibility



A simulation must be reproducible.



Given identical:



\- device configuration

\- environment

\- model version

\- calibration version

\- assumptions



the simulator must return the same result.



No random variation should affect published results.



\---



\# 4. Fundamental Simulation Architecture



Every simulation consists of three major layers:



\## DEVICE



What hardware and configuration are being simulated?



Examples:



\- processor

\- battery

\- display

\- cameras

\- memory

\- cooling

\- materials

\- dimensions

\- radios



\---



\## ENVIRONMENT



Under what conditions is the device being tested?



Examples:



\- ambient temperature

\- brightness

\- network type

\- signal quality

\- refresh-rate behavior

\- workload

\- workload duration

\- camera scenario

\- performance mode



\---



\## MODEL



What does PhoneFuturist currently know about how those components behave?



Examples:



\- display power calibration

\- SoC efficiency calibration

\- processor performance model

\- thermal model

\- battery usable-energy model

\- camera sensor model

\- optical model



\---



\## Simulation equation



Conceptually:



DEVICE + ENVIRONMENT + MODEL = SIMULATION RESULT



These layers must remain distinguishable in code and stored results.



\---



\# 5. Evidence and Provenance



Every important simulation parameter should be capable of carrying provenance.



Initial provenance classes:



\- `measured`

\- `confirmed`

\- `reported`

\- `modeled`

\- `user`

\- `estimated`

\- `unknown`



Definitions:



\## measured



Obtained from a credible physical measurement or test.



\## confirmed



Officially established by a manufacturer or authoritative technical source.



\## reported



Published or leaked information that has not been officially confirmed.



\## modeled



Derived from a PhoneFuturist model or calibrated relationship.



\## user



Explicitly supplied or overridden by the simulation creator.



\## estimated



An explicit engineering estimate not directly measured or confirmed.



\## unknown



No supported value exists.



Provenance must survive through simulation processing and published results.



\---



\# 6. Evidence Conflicts



Interactive Leaks must support conflicting reports.



Example:



Battery report A:



> 5500 mAh



Battery report B:



> 5800 mAh



The system must not silently choose one merely because it needs a value.



Possible behavior:



\- allow the user to select a report

\- allow PhoneFuturist to designate a current working configuration

\- allow both configurations to be simulated

\- allow configurations to be compared



Future UI may expose:



\*\*Most likely configuration\*\*



\*\*Alternative configuration\*\*



\*\*Test all reported configurations\*\*



Any probability or likelihood system must have a documented methodology.



Do not invent probabilities.



\---



\# 7. Simple and Detailed Configuration



Interactive Leaks should support two levels of configuration.



\## Simple Configuration



Designed for most users.



Users select or enter headline specifications.



Examples:



\- processor

\- battery capacity

\- display size

\- display resolution

\- refresh rate

\- camera configuration

\- memory

\- cooling class



PhoneFuturist resolves additional parameters where legitimate calibrated information exists.



\---



\## Detailed Configuration



Designed for enthusiasts, engineers, analysts, reviewers, and advanced users.



Detailed Configuration may eventually expose:



\### Battery



\- capacity

\- nominal voltage

\- usable-energy window

\- cell configuration

\- battery chemistry where relevant



\### Display



\- panel technology

\- panel generation

\- diagonal

\- resolution

\- refresh-rate behavior

\- LTPO minimum

\- brightness

\- average picture level

\- measured or modeled panel power



\### Processor



\- architecture

\- process node

\- CPU configuration

\- CPU clocks

\- GPU configuration

\- GPU clocks

\- NPU

\- ISP

\- power limits

\- measured or modeled power behavior



\### Memory and storage



\- RAM type

\- RAM capacity

\- memory bandwidth

\- storage type

\- storage capacity



\### Connectivity



\- modem

\- network type

\- signal assumptions

\- Wi-Fi

\- Bluetooth

\- satellite where applicable



\### Thermal system



\- cooling architecture

\- vapor chamber

\- graphite

\- thermal limits

\- chassis material

\- ambient temperature



\### Camera



\- sensor format

\- resolution

\- pixel architecture where known

\- lens

\- aperture

\- equivalent focal length

\- physical focal length

\- stabilization

\- ISP assumptions

\- processing model

\- video mode



Advanced users may eventually override modeled subsystem power or measured parameters directly.



Simple and Detailed Configuration must feed the same underlying simulation engine.



They are not separate simulators.



\---



\# 8. Simulation Domains



Interactive Leaks should eventually contain the following major simulation domains.



\---



\# 8.1 Battery Experience



Battery Experience models device runtime and energy consumption.



Initial workloads:



\- Mixed use

\- Web browsing

\- Video playback

\- Gaming

\- Camera

\- Standby



Potential future workloads:



\- Navigation

\- Video calling

\- Social media

\- Music streaming

\- Hotspot

\- Productivity

\- AI workloads

\- Custom workload



Conceptual model:



Usable battery energy / average modeled device power = runtime



Total device power may contain:



\- display

\- compute

\- memory/platform

\- connectivity

\- background

\- workload-specific hardware



Battery Experience should eventually provide:



\- runtime range

\- average power range

\- usable battery energy

\- major power contributors

\- assumptions

\- provenance

\- uncertainty explanation

\- comparison against another device

\- simulated day timeline



Battery Experience must not derive runtime from capacity alone.



\---



\# 8.2 Performance



Performance simulation should eventually model:



\- CPU performance

\- GPU performance

\- NPU/AI performance where meaningful

\- benchmark ranges

\- peak performance

\- sustained performance

\- power efficiency



Potential benchmark models may include commonly used public benchmarks.



Benchmark outputs must be calibrated against real hardware.



Clock speed alone must never be treated as sufficient to estimate performance.



Architecture, IPC, cache, memory, process technology, power behavior, benchmark characteristics, and other relevant factors must be considered where data exists.



\---



\# 8.3 Thermals



Thermal simulation should eventually model the relationship between:



\- processor power

\- workload

\- cooling system

\- device construction

\- ambient conditions

\- temperature

\- sustained performance



Potential outputs:



\- temperature range

\- sustained performance curve

\- throttling onset

\- estimated thermal equilibrium

\- performance after prolonged load



Thermal results must be modeled and clearly labeled as such.



\---



\# 8.4 Display



Display simulation should eventually model:



\- resolution

\- pixel density

\- refresh rate

\- adaptive refresh behavior

\- panel efficiency

\- brightness

\- outdoor visibility

\- power consumption

\- impact on battery

\- rendering workload



Display simulation should interact with Battery Experience and Performance.



\---



\# 8.5 Camera



Camera simulation is one of the most ambitious Interactive Leaks systems.



It should eventually model characteristics including:



\- light collection

\- sensor size

\- aperture

\- exposure

\- resolution

\- noise

\- detail

\- crop

\- focal length

\- optical characteristics

\- stabilization

\- processing assumptions

\- ISP capabilities where measurable



Potential scenarios:



\- daylight

\- indoor

\- low light

\- night

\- portrait

\- telephoto

\- long-range zoom

\- video



\---



\# 9. Camera Visual Simulation



Camera simulation should eventually include controlled visual comparisons.



Example:



S26 Ultra simulation | S27 Ultra simulation



A user may move a comparison slider across the same reference scene.



The reference scene must remain identical.



The simulation may model supported characteristics such as:



\- exposure

\- photon noise

\- color noise

\- detail retention

\- motion blur

\- highlight clipping

\- shadow recovery

\- sharpening

\- denoising

\- resolution differences



Changing supported camera parameters should alter the controlled visualization.



Example:



Changing sensor format:



1/1.3" -> 1/1.1"



may alter supported light/noise calculations.



Changing aperture:



f/1.7 -> f/1.4



may alter supported exposure calculations.



\---



\## Camera integrity rule



Interactive Leaks must never present a simulated camera visualization as an exact prediction of an unreleased manufacturer's image output.



PhoneFuturist does not possess the manufacturer's unreleased:



\- ISP tuning

\- denoising

\- tone mapping

\- lens calibration

\- color science

\- computational photography algorithms



Camera visualizations must therefore be labeled as simulated imaging characteristics.



Suggested disclosure:



> Visualization of modeled imaging characteristics. This is not a prediction of the manufacturer's exact image processing.



Camera visualization must not become an arbitrary image filter.



\---



\# 10. Upgrade Simulator



Users should be able to compare a simulated device against:



\- its previous generation

\- another released device

\- another hypothetical configuration

\- another community simulation



Example:



Galaxy S27 Ultra vs Galaxy S26 Ultra



Potential output:



Battery:

+12–18%



Performance:

+20–27%



Low-light imaging:

+10–16%



Display efficiency:

+5–9%



The simulator should explain why.



Example contributors:



Battery capacity:

+11.5%



Display efficiency:

+4–7%



Compute efficiency:

+3–6%



Higher peak performance:

\-2–5% battery impact



The result should not be a mysterious score.



\---



\# 11. Comparison



Interactive Leaks should support configuration comparison.



Example:



Configuration A:

\- Processor A

\- 5500 mAh



Configuration B:

\- Processor B

\- 5800 mAh



Both configurations should be processed using the same engine/model version and comparable environment.



Users should be able to see how changing one or several assumptions affects results.



\---



\# 12. Test Conditions



Environment/test conditions must be visible and reproducible.



Examples:



Battery test:



\- 200-nit display

\- Wi-Fi

\- adaptive 120 Hz

\- 25°C ambient

\- defined workload



Performance test:



\- 25°C ambient

\- defined performance mode

\- defined duration



Camera test:



\- defined illuminance

\- defined scene

\- defined exposure constraints



A simulation result without its test conditions is incomplete.



\---



\# 13. Calibration



Modeled simulation requires calibration against released hardware.



PhoneFuturist should maintain calibration datasets containing credible measurements from existing devices.



Potential calibration data:



\- battery runtime tests

\- subsystem power measurements

\- processor benchmark results

\- sustained performance

\- device temperatures

\- display power

\- display brightness

\- camera sensor characteristics

\- controlled camera measurements



Calibration sources must be traceable.



The model should not treat all external measurements as equally reliable.



Future calibration architecture may assign evidence quality categories, but must not fabricate statistical confidence.



\---



\# 14. Confidence and Reliability



Interactive Leaks should not display arbitrary confidence percentages.



Prefer qualitative reliability:



\- High

\- Medium

\- Low

\- Insufficient data



The explanation matters more than the label.



Example:



\*\*Reliability: Medium\*\*



Why:



\- battery capacity is confirmed

\- display characteristics are strongly reported

\- processor efficiency is modeled from early architecture information

\- modem power behavior is unknown



Confidence should reflect evidence quality and model completeness.



It must not imply statistical certainty unless statistical methodology actually exists.



\---



\# 15. Result Explanations



Every major modeled result should eventually support:



\*\*Why did I get this result?\*\*



Example:



Estimated battery life improved primarily because:



1\. battery capacity increased

2\. display efficiency improved

3\. processor efficiency improved



Offset by:



4\. higher sustained GPU performance



Interactive Leaks should explain causality where the model supports it.



\---



\# 16. Simulation Result Structure



A complete simulation result should eventually contain:



\- simulation ID

\- creator

\- created timestamp

\- engine version

\- model versions

\- calibration version

\- device configuration

\- environment

\- assumptions

\- evidence/provenance

\- calculated results

\- modeled results

\- unresolved values

\- warnings

\- reliability explanations

\- comparison baseline where applicable



Published simulations must preserve these values.



\---



\# 17. Engine Versioning



Every simulation result must record the engine version that produced it.



Example:



`0.5.0`



Published simulations must not silently change when PhoneFuturist updates its models.



A simulation produced with Engine 0.5.0 remains an Engine 0.5.0 result.



Users may later choose:



\*\*Re-run with latest engine\*\*



This should create a new result or revision rather than silently replacing the original.



\---



\# 18. Model Versioning



Individual models may eventually require independent versions.



Examples:



Battery Model:

`battery-1.2`



Performance Model:

`performance-1.1`



Camera Model:

`camera-0.8`



This allows PhoneFuturist to improve one model without destroying reproducibility.



\---



\# 19. Simulation Lifecycle



Potential simulation states:



\## Draft



Editable private configuration.



\## Saved



Stored simulation that may remain private.



\## Published



Public immutable simulation snapshot.



\## Forked



New simulation derived from another simulation.



A published simulation should not mutate underneath existing links.



Editing a published simulation should create a new revision or fork-like result.



\---



\# 20. Publishing



Users should eventually be able to publish simulations.



A published simulation should receive a permanent public URL.



Example:



`/simulations/galaxy-s27-ultra-8f32a`



A public simulation page should clearly show:



\- device name

\- creator

\- engine/model version

\- configuration

\- results

\- provenance

\- assumptions

\- unresolved information

\- warnings

\- publication date



\---



\# 21. Forking



Users should be able to fork another simulation.



Forking creates an editable copy.



Example:



Original:



Galaxy S27 Ultra

5500 mAh



Fork:



Galaxy S27 Ultra

5800 mAh



The fork should preserve attribution to the original simulation.



Potential lineage:



Simulation A

↓

Fork B

↓

Fork C



This allows community experimentation without modifying another user's published result.



\---



\# 22. Simulation Browser



PhoneFuturist should eventually provide a public Simulation Browser inspired by benchmark result databases.



Users may search for:



\- device

\- processor

\- configuration

\- creator

\- engine version



Potential filters:



\- PhoneFuturist

\- Community

\- latest

\- most forked

\- processor

\- battery configuration

\- engine version



The browser should become a searchable archive of hypothetical device configurations and results.



\---



\# 23. Provenance Labels for Public Simulations



Public simulations should clearly distinguish their origin.



Potential labels:



\## Community Simulation



Created by a user.



\## Based on PhoneFuturist Reporting



Uses reported specifications stored by PhoneFuturist.



\## PhoneFuturist Model



Created and published by PhoneFuturist using its own evidence and modeling.



These labels describe provenance.



They must not imply that an unreleased device itself is confirmed.



\---



\# 24. Sharing



Published simulations should be shareable.



Potential share card:



\*\*Galaxy S27 Ultra Simulation\*\*



5800 mAh  

Exynos 2700  

QHD+ adaptive 120 Hz



Estimated mixed-use battery:

12–14 hours



Estimated performance uplift:

+X–Y%



Engine:

vX.X



\*\*Run / Fork this simulation on PhoneFuturist\*\*



Share cards must identify modeled results as modeled.



\---



\# 25. Article Integration



PhoneFuturist articles should eventually be able to launch simulations directly.



Example:



A PhoneFuturist article reports:



\- 5800 mAh battery

\- Exynos 2700

\- new camera sensor

\- updated display



The article may include:



\*\*Simulate this leak\*\*



Interactive Leaks opens with the reported configuration already loaded.



The user can then modify disputed assumptions and observe modeled consequences.



This creates the loop:



REPORT -> SIMULATE -> MODIFY -> COMPARE -> PUBLISH -> SHARE



\---



\# 26. Intelligence Database Integration



Interactive Leaks should eventually integrate with PhoneFuturist's Intelligence database.



The Intelligence database stores evidence and claims.



Interactive Leaks consumes resolved or user-selected claims as simulation inputs.



The simulation engine must not silently reinterpret evidence.



Conceptually:



Evidence

↓

Claims

↓

Resolved device configuration

↓

Simulation

↓

Result



Evidence management and simulation remain distinct systems.



\---



\# 27. User Experience



The final experience should emphasize consequences rather than raw input forms.



Potential primary workflow:



\## Build



Create or load the device configuration.



\## Simulate / Test



Run real-world modeled scenarios.



\## Compare



Compare generations or alternative configurations.



\## Results



Inspect and share the final simulation.



The exact tab/navigation structure may change during UX development.



The conceptual workflow should remain.



\---



\# 28. Live Simulation



Where computationally practical, supported parameter changes should update results immediately.



Example:



Battery:

5500 -> 5800 mAh



The battery model updates.



Display:

FHD -> QHD



Display workload and battery model update where supported.



Refresh:

60 -> 120 Hz



Relevant models update.



The system should feel like manipulating a virtual prototype, not repeatedly submitting a static form.



\---



\# 29. Visual Experience



Interactive Leaks should use visual explanations where they improve understanding.



Examples:



\- battery day timeline

\- battery discharge curve

\- sustained performance curve

\- thermal curve

\- camera comparison slider

\- display visualization

\- generation comparison

\- contributor breakdown



Visualizations must represent actual model outputs.



They must not exist merely for decoration.



\---



\# 30. Advanced Engineering Information



Existing v0.4 engineering calculations remain valuable.



These include:



\- geometry

\- display dimensions

\- battery physical calculations

\- camera optical calculations

\- packaging calculations



However, these should generally become advanced engineering information rather than the primary consumer experience.



They may appear under:



\*\*Engineering Details\*\*



or:



\*\*Advanced Analysis\*\*



The primary product should focus on what hardware changes mean in use.



\---



\# 31. Current Engine State



Stable engine:



\*\*v0.4.0\*\*



Stable Git tag:



`simulation-v0.4.0`



Current capabilities include deterministic foundations for:



\- display geometry

\- display pixel density

\- screen-to-body calculations

\- battery energy

\- battery physical volume

\- battery energy density

\- camera sensor approximation

\- camera optics

\- camera explicit module volume

\- multiple camera configurations

\- aggregate packaging volume

\- unknown-data handling

\- warnings

\- engine versioning



v0.4 is a foundation.



It is not considered the finished Interactive Leaks product.



\---



\# 32. Development Roadmap



Target feature freeze:



\*\*October 10, 2026\*\*



Hard availability deadline:



\*\*Before October 16, 2026\*\*



Planned development sequence:



\## v0.5

Battery Experience



\## v0.6

Performance foundation



\## v0.7

Thermals and sustained performance



\## v0.8

Display behavior and cross-model power interaction



\## v0.9

Upgrade and configuration comparison



\## v1.0 candidate

Integrated virtual prototype experience



Camera visual simulation may evolve independently because it requires substantial calibration and validation.



Community publishing infrastructure may also be developed in parallel.



Version numbering may change if engineering requirements justify it.



\---



\# 33. Parallel Development



Different agents or contributors may work on separate subsystems.



Examples:



\- Battery Experience

\- Performance

\- Simulation persistence

\- Simulation Browser

\- UI

\- calibration tooling

\- Camera R\&D



Avoid multiple agents modifying central engine files simultaneously unless coordinated.



Prefer isolated modules, tests, branches, and pull requests.



\---



\# 34. Branching Rules



Stable `main` must remain functional.



Major simulation development should occur on dedicated branches.



Examples:



`simulation/v0.5-battery`



`simulation/v0.6-performance`



`simulation/community-browser`



`simulation/camera-model`



No major simulation branch should be merged without:



\- review

\- existing tests passing

\- new tests for new behavior

\- Astro check passing

\- production build passing



\---



\# 35. Testing Rules



Tests are part of the simulation specification.



Contributors must not:



\- delete tests because implementation fails

\- weaken assertions simply to make a build green

\- replace deterministic behavior with untested assumptions



New model behavior requires tests.



Important edge cases include:



\- missing inputs

\- invalid inputs

\- zero values

\- negative values

\- conflicting inputs

\- ranges

\- provenance preservation

\- unresolved outputs

\- version preservation



\---



\# 36. Scientific Integrity



Interactive Leaks is not a laboratory measurement of an unreleased physical device.



It is a simulation.



The platform must clearly distinguish:



\- measured facts

\- confirmed specifications

\- reports

\- assumptions

\- calculations

\- modeled estimates



The simulator must never imply access to physical hardware that PhoneFuturist does not possess.



It must never claim to reproduce proprietary manufacturer behavior exactly unless such behavior has genuinely been measured or documented.



\---



\# 37. Product Philosophy



Interactive Leaks should make technology reporting testable.



Traditional leak reporting says:



> This phone may have a 5800 mAh battery.



Interactive Leaks should allow the reader to ask:



> What happens if it does?



Traditional reporting says:



> This device may use a new processor.



Interactive Leaks should allow:



> What could that mean for performance, efficiency, and battery life?



Traditional reporting says:



> This camera sensor may be larger.



Interactive Leaks should eventually allow:



> What imaging characteristics could that change?



The platform should transform leaked specifications from static numbers into explorable hypotheses.



\---



\# 38. Core Product Loop



The desired ecosystem is:



\*\*REPORT\*\*



PhoneFuturist or another source reports information.



↓



\*\*BUILD\*\*



The reported configuration becomes a virtual device.



↓



\*\*SIMULATE\*\*



Models estimate supported real-world consequences.



↓



\*\*TEST\*\*



Users modify assumptions and configurations.



↓



\*\*COMPARE\*\*



Alternative configurations or generations are evaluated.



↓



\*\*PUBLISH\*\*



The simulation becomes a reproducible public snapshot.



↓



\*\*SHARE\*\*



The result travels outside PhoneFuturist.



↓



\*\*FORK\*\*



Another user changes the assumptions and runs another simulation.



↓



\*\*DISCOVER\*\*



Simulations accumulate in the public Simulation Browser.



This loop is central to the long-term value of Interactive Leaks.



\---



\# 39. Definition of Success



Interactive Leaks succeeds when a user sees a hardware rumor and thinks:



> I want to run that through PhoneFuturist.



The product should become useful not because it produces impressive-looking numbers, but because users trust that:



\- assumptions are visible

\- uncertainty is acknowledged

\- evidence is traceable

\- calculations are reproducible

\- models improve over time

\- competing rumors can be tested rather than merely argued about



\---



\# 40. Final Product Statement



Interactive Leaks is:



> A virtual prototype of an unreleased device, built from what is currently known about it.



Its purpose is not to predict the future with certainty.



Its purpose is to let people explore the technical consequences of possible futures.



PhoneFuturist does not tell the user which leak must be true.



\*\*Interactive Leaks lets them test what could be true if the leak is true.\*\*

