const NAMES = {
  B737: "Boeing 737-700",
  B738: "Boeing 737-800",
  B739: "Boeing 737-900",
  B38M: "Boeing 737 MAX 8",
  B39M: "Boeing 737 MAX 9",
  B744: "Boeing 747-400",
  B748: "Boeing 747-8",
  B763: "Boeing 767-300",
  B772: "Boeing 777-200",
  B77W: "Boeing 777-300ER",
  B788: "Boeing 787-8",
  B789: "Boeing 787-9",
  B78X: "Boeing 787-10",
  A319: "Airbus A319",
  A320: "Airbus A320",
  A20N: "Airbus A320neo",
  A321: "Airbus A321",
  A21N: "Airbus A321neo",
  A332: "Airbus A330-200",
  A333: "Airbus A330-300",
  A339: "Airbus A330-900neo",
  A359: "Airbus A350-900",
  A35K: "Airbus A350-1000",
  A388: "Airbus A380-800",
};

export const aircraftName = (code) => (code ? NAMES[code.toUpperCase()] ?? code.toUpperCase() : "");

// "Boeing 737-800" -> "B737-800" for tight spaces like the status bar.
export function aircraftShort(code) {
  const name = aircraftName(code);
  return name.replace(/^Boeing /, "B").replace(/^Airbus /, "");
}

export const dutyShort = (duty) =>
  ({ Captain: "CPT", "First Officer": "FO", "Relief Pilot": "RP", Observer: "OBS" })[duty] ?? duty;
