import {
  ComparisonOperator,
  TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";

import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";

export interface DataFreshnessThreshold extends CustomAlarmThreshold {
  readonly ageOfRecordThreshold: number;
}

export interface MaxIteratorAgeThreshold extends CustomAlarmThreshold {
  readonly maxAgeInMillis: number;
}

export interface RecordsThrottledThreshold extends CustomAlarmThreshold {
  readonly maxRecordsThrottledThreshold: number;
}

export interface RecordsFailedThreshold extends CustomAlarmThreshold {
  readonly maxRecordsFailedThreshold: number;
}

export class KinesisAlarmFactory {
  protected readonly alarmFactory: AlarmFactory;

  constructor(alarmFactory: AlarmFactory) {
    this.alarmFactory = alarmFactory;
  }

  addIteratorMaxAgeAlarm(
    metric: MetricWithAlarmSupport,
    props: MaxIteratorAgeThreshold,
    disambiguator?: string
  ) {
    return this.alarmFactory.addAlarm(metric, {
      treatMissingData:
        props.treatMissingDataOverride ?? TreatMissingData.MISSING,
      comparisonOperator:
        props.comparisonOperatorOverride ??
        ComparisonOperator.GREATER_THAN_THRESHOLD,
      ...props,
      disambiguator,
      threshold: props.maxAgeInMillis,
      alarmNameSuffix: "Iterator-Age-Max",
      alarmDescription: `Iterator Max Age is too high.`,
      // we will dedupe any kind of message count issue to the same ticket
      alarmDedupeStringSuffix: "AnyDataStreamIteratorMaxAge",
    });
  }

  addOldAgeOfRecordAlarm(
    metric: MetricWithAlarmSupport,
    props: DataFreshnessThreshold,
    disambiguator?: string
  ) {
    return this.alarmFactory.addAlarm(metric, {
      treatMissingData:
        props.treatMissingDataOverride ?? TreatMissingData.MISSING,
      comparisonOperator:
        props.comparisonOperatorOverride ??
        ComparisonOperator.GREATER_THAN_THRESHOLD,
      ...props,
      disambiguator,
      threshold: props.ageOfRecordThreshold,
      alarmNameSuffix: "Record-Max-Age",
      alarmDescription: `Max Age of Record in firehose is too high.`,
      alarmDedupeStringSuffix: "MaxAgeOfRecordExceededInDeliveryStream",
    });
  }

  addPutRecordsThrottledAlarm(
    metric: MetricWithAlarmSupport,
    props: RecordsThrottledThreshold,
    disambiguator?: string
  ) {
    const threshold = props.maxRecordsThrottledThreshold;
    return this.alarmFactory.addAlarm(metric, {
      treatMissingData:
        props.treatMissingDataOverride ?? TreatMissingData.NOT_BREACHING,
      comparisonOperator:
        props.comparisonOperatorOverride ??
        ComparisonOperator.GREATER_THAN_THRESHOLD,
      ...props,
      disambiguator,
      threshold: threshold,
      alarmNameSuffix: "PutRecordsThrottled",
      alarmDescription: `Number of throttled PutRecords exceeded threshold of ${threshold}`,
      // we will dedupe any kind of message count issue to the same ticket
      alarmDedupeStringSuffix: "PutRecordsThrottled",
    });
  }

  addPutRecordsFailedAlarm(
    metric: MetricWithAlarmSupport,
    props: RecordsFailedThreshold,
    disambiguator?: string
  ) {
    const threshold = props.maxRecordsFailedThreshold;
    return this.alarmFactory.addAlarm(metric, {
      treatMissingData:
        props.treatMissingDataOverride ?? TreatMissingData.NOT_BREACHING,
      comparisonOperator:
        props.comparisonOperatorOverride ??
        ComparisonOperator.GREATER_THAN_THRESHOLD,
      ...props,
      disambiguator,
      threshold,
      alarmNameSuffix: "PutRecordsFailed",
      alarmDescription: `Number of failed PutRecords exceeded threshold of ${threshold}`,
      // we will dedupe any kind of message count issue to the same ticket
      alarmDedupeStringSuffix: "PutRecordsFailed",
    });
  }

  addProvisionedReadThroughputExceededAlarm(
    metric: MetricWithAlarmSupport,
    props: RecordsThrottledThreshold,
    disambiguator: string
  ) {
    const threshold = props.maxRecordsThrottledThreshold;
    return this.alarmFactory.addAlarm(metric, {
      treatMissingData:
        props.treatMissingDataOverride ?? TreatMissingData.NOT_BREACHING,
      comparisonOperator:
        props.comparisonOperatorOverride ??
        ComparisonOperator.GREATER_THAN_THRESHOLD,
      ...props,
      disambiguator,
      threshold,
      alarmNameSuffix: "ReadThroughputExceeded",
      alarmDescription: `Number of records resulting in read throughput capacity throttling reached the threshold of ${threshold}.`,
    });
  }

  addProvisionedWriteThroughputExceededAlarm(
    metric: MetricWithAlarmSupport,
    props: RecordsThrottledThreshold,
    disambiguator: string
  ) {
    const threshold = props.maxRecordsThrottledThreshold;
    return this.alarmFactory.addAlarm(metric, {
      treatMissingData:
        props.treatMissingDataOverride ?? TreatMissingData.NOT_BREACHING,
      comparisonOperator:
        props.comparisonOperatorOverride ??
        ComparisonOperator.GREATER_THAN_THRESHOLD,
      ...props,
      disambiguator,
      threshold,
      alarmNameSuffix: "WriteThroughputExceeded",
      alarmDescription: `Number of records resulting in write throughput capacity throttling reached the threshold of ${threshold}.`,
    });
  }
}
