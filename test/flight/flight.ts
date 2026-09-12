export type PlainFlight = {
  /** unique 24-bit ICAO transponder address */
  icao: string;
  callsign: string;
  country: string;
  lon: number;
  lat: number;
  /** metres */
  altitude: number;
  /** metres per second */
  velocity: number;
  /** degrees clockwise from north */
  heading: number;
  onGround: boolean;
  /** metres per second, positive is climbing */
  verticalRate: number;
  /** transponder code. 7500 hijack · 7600 radio failure · 7700 emergency */
  squawk: string;
  /** unix seconds of last position report */
  seen: number;
};

/** enrichment, looked up once per aircraft and cached forever */
export type AircraftInfo = {
  registration?: string;
  type?: string;
  icaoType?: string;
  manufacturer?: string;
  owner?: string;
  photo?: string;
};

export type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number };
export type RouteInfo = { airline?: string; origin?: Airport; destination?: Airport };

/** One aircraft, as reported by its transponder. */
export class Flight {
  constructor(readonly d: PlainFlight) {}

  get icao() { return this.d.icao; }
  get callsign() { return this.d.callsign?.trim() || this.d.icao.toUpperCase(); }
  get altitudeFt() { return Math.round(this.d.altitude * 3.28084); }
  get knots() { return Math.round(this.d.velocity * 1.94384); }

  /** crude but effective: airborne, moving, and high enough to be en route. */
  get isCruising() { return !this.d.onGround && this.d.altitude > 6000; }

  /** feet per minute, the number a pilot would read */
  get climbFpm() { return Math.round(this.d.verticalRate * 196.85); }

  get phase(): 'climbing' | 'descending' | 'cruising' {
    if (this.d.verticalRate > 1.5) return 'climbing';
    if (this.d.verticalRate < -1.5) return 'descending';
    return 'cruising';
  }

  /** 7500 hijack · 7600 radio failure · 7700 general emergency */
  get emergency(): string | undefined {
    return ({ '7500': 'Hijack', '7600': 'Radio failure', '7700': 'Emergency' } as Record<string, string>)[this.d.squawk];
  }

  /**
   * Dead-reckon the position forward by `seconds`.
   * The server only polls occasionally; this is what makes the map move
   * smoothly between updates instead of teleporting.
   */
  project(seconds: number): { lon: number; lat: number } {
    if (this.d.onGround || !this.d.velocity) return { lon: this.d.lon, lat: this.d.lat };
    const metres = this.d.velocity * seconds;
    const rad = (this.d.heading * Math.PI) / 180;
    const dLat = (metres * Math.cos(rad)) / 111_320;
    const cosLat = Math.cos((this.d.lat * Math.PI) / 180) || 1e-6;
    const dLon = (metres * Math.sin(rad)) / (111_320 * cosLat);
    return { lon: this.d.lon + dLon, lat: this.d.lat + dLat };
  }

  toObject(): PlainFlight { return { ...this.d }; }
  static from(p: PlainFlight) { return new Flight(p); }

  /**
   * Compact wire row. Nine thousand aircraft as objects is a megabyte;
   * as rounded arrays it is a third of that.
   */
  toRow(): (string | number)[] {
    return [
      this.d.icao, this.d.callsign.trim(), this.d.country,
      Math.round(this.d.lon * 1000) / 1000, Math.round(this.d.lat * 1000) / 1000,
      Math.round(this.d.altitude), Math.round(this.d.velocity), Math.round(this.d.heading),
      Math.round(this.d.verticalRate * 10) / 10, this.d.squawk,
    ];
  }

  static fromRow(r: any[]): Flight {
    return new Flight({
      icao: r[0], callsign: r[1], country: r[2], lon: r[3], lat: r[4],
      altitude: r[5], velocity: r[6], heading: r[7], verticalRate: r[8], squawk: r[9],
      onGround: false, seen: 0,
    });
  }

  /** parse one row of OpenSky's positional array format. */
  static fromStateVector(s: (string | number | boolean | null)[]): Flight | undefined {
    const [icao, callsign, country, , lastContact, lon, lat, baroAlt, onGround, vel, track, vRate, , , squawk] = s;
    if (typeof lon !== 'number' || typeof lat !== 'number') return undefined;
    return new Flight({
      icao: String(icao),
      callsign: typeof callsign === 'string' ? callsign : '',
      country: typeof country === 'string' ? country : 'Unknown',
      lon, lat,
      altitude: typeof baroAlt === 'number' ? baroAlt : 0,
      velocity: typeof vel === 'number' ? vel : 0,
      heading: typeof track === 'number' ? track : 0,
      onGround: Boolean(onGround),
      verticalRate: typeof vRate === 'number' ? vRate : 0,
      squawk: typeof squawk === 'string' ? squawk : '',
      seen: typeof lastContact === 'number' ? lastContact : Math.floor(Date.now() / 1000),
    });
  }
}
