declare module 'google-trends-api' {
  interface InterestOverTimeOptions {
    keyword: string;
    startTime: Date;
    endTime: Date;
    granularTimeUnit?: string;
  }

  interface RelatedQueriesOptions {
    keyword: string;
    startTime: Date;
    endTime: Date;
  }

  interface InterestByRegionOptions {
    keyword: string;
    startTime: Date;
    endTime: Date;
    resolution?: string;
  }

  export function interestOverTime(options: InterestOverTimeOptions): Promise<string>;
  export function relatedQueries(options: RelatedQueriesOptions): Promise<string>;
  export function interestByRegion(options: InterestByRegionOptions): Promise<string>;
}
