import {
  GraphWidget,
  HorizontalAnnotation,
  IWidget,
} from "aws-cdk-lib/aws-cloudwatch";

import {
  BaseMonitoringProps,
  CountAxisFromZero,
  DataFreshnessThreshold,
  DefaultGraphWidgetHeight,
  DefaultSummaryWidgetHeight,
  HalfWidth,
  KinesisAlarmFactory,
  MetricWithAlarmSupport,
  Monitoring,
  MonitoringScope,
  RateAxisFromZero,
  RecordsThrottledThreshold,
  SixthWidth,
  TimeAxisMillisFromZero,
  TimeAxisSecondsFromZero,
} from "../../common";
import {
  MonitoringHeaderWidget,
  MonitoringNamingStrategy,
} from "../../dashboard";
import {
  KinesisFirehoseMetricFactory,
  KinesisFirehoseMetricFactoryProps,
} from "./KinesisFirehoseMetricFactory";

export interface KinesisFirehoseMonitoringOptions extends BaseMonitoringProps {
  readonly addDeliveryFreshnessAlarm?: Record<string, DataFreshnessThreshold>;
  readonly addRecordsThrottledAlarm?: Record<string, RecordsThrottledThreshold>;
}

export interface KinesisFirehoseMonitoringProps
  extends KinesisFirehoseMetricFactoryProps,
    KinesisFirehoseMonitoringOptions {}

export class KinesisFirehoseMonitoring extends Monitoring {
  readonly title: string;
  readonly streamUrl?: string;

  readonly kinesisAlarmFactory: KinesisAlarmFactory;
  readonly recordCountAnnotations: HorizontalAnnotation[];
  readonly ageAnnotations: HorizontalAnnotation[];

  readonly incomingBytesMetric: MetricWithAlarmSupport;
  readonly incomingRecordsMetric: MetricWithAlarmSupport;
  readonly throttledRecordsMetric: MetricWithAlarmSupport;
  readonly successfulConversionMetric: MetricWithAlarmSupport;
  readonly failedConversionMetric: MetricWithAlarmSupport;
  readonly putRecordLatency: MetricWithAlarmSupport;
  readonly putRecordBatchLatency: MetricWithAlarmSupport;
  readonly incomingBytesToLimitRate: MetricWithAlarmSupport;
  readonly incomingRecordsToLimitRate: MetricWithAlarmSupport;
  readonly incomingPutRequestsToLimitRate: MetricWithAlarmSupport;
  readonly maxAgeofRecordsMetric: MetricWithAlarmSupport;
  readonly deliveredRecordsMetric: MetricWithAlarmSupport;

  constructor(scope: MonitoringScope, props: KinesisFirehoseMonitoringProps) {
    super(scope);

    const namingStrategy = new MonitoringNamingStrategy({
      ...props,
      fallbackConstructName: props.deliveryStreamName,
    });
    this.title = namingStrategy.resolveHumanReadableName();
    this.streamUrl = scope
      .createAwsConsoleUrlFactory()
      .getKinesisFirehoseDeliveryStreamUrl(props.deliveryStreamName);

    const metricFactory = new KinesisFirehoseMetricFactory(
      scope.createMetricFactory(),
      props
    );
    const alarmFactory = this.createAlarmFactory(
      namingStrategy.resolveAlarmFriendlyName()
    );
    this.kinesisAlarmFactory = new KinesisAlarmFactory(alarmFactory);
    this.recordCountAnnotations = [];
    this.ageAnnotations = [];

    this.incomingBytesMetric = metricFactory.metricIncomingBytes();
    this.incomingRecordsMetric = metricFactory.metricIncomingRecordCount();
    this.throttledRecordsMetric = metricFactory.metricThrottledRecordCount();
    this.successfulConversionMetric =
      metricFactory.metricSuccessfulConversionCount();
    this.failedConversionMetric = metricFactory.metricFailedConversionCount();
    this.putRecordLatency = metricFactory.metricPutRecordLatencyP90InMillis();
    this.putRecordBatchLatency =
      metricFactory.metricPutRecordBatchLatencyP90InMillis();
    this.incomingBytesToLimitRate =
      metricFactory.metricIncomingBytesToLimitRate();
    this.incomingRecordsToLimitRate =
      metricFactory.metricIncomingRecordsToLimitRate();
    this.incomingPutRequestsToLimitRate =
      metricFactory.metricIncomingPutRequestsToLimitRate();
    this.deliveredRecordsMetric = metricFactory.metricDeliveredRecordCount();
    this.maxAgeofRecordsMetric = metricFactory.metricDataFreshness();

    for (const disambiguator in props.addRecordsThrottledAlarm) {
      const alarmProps = props.addRecordsThrottledAlarm[disambiguator];
      const createdAlarm = this.kinesisAlarmFactory.addPutRecordsThrottledAlarm(
        this.throttledRecordsMetric,
        alarmProps,
        disambiguator
      );
      this.recordCountAnnotations.push(createdAlarm.annotation);
      this.addAlarm(createdAlarm);
    }

    for (const disambiguator in props.addDeliveryFreshnessAlarm) {
      const alarmProps = props.addDeliveryFreshnessAlarm[disambiguator];
      const createdAlarm = this.kinesisAlarmFactory.addOldAgeOfRecordAlarm(
        this.maxAgeofRecordsMetric,
        alarmProps,
        disambiguator
      );
      this.ageAnnotations.push(createdAlarm.annotation);
      this.addAlarm(createdAlarm);
    }

    props.useCreatedAlarms?.consume(this.createdAlarms());
  }

  summaryWidgets(): IWidget[] {
    return [
      this.createTitleWidget(),
      this.createIncomingRecordWidget(HalfWidth, DefaultSummaryWidgetHeight),
      this.createConversionWidget(HalfWidth, DefaultSummaryWidgetHeight),
    ];
  }

  widgets(): IWidget[] {
    return [
      this.createTitleWidget(),
      this.createIncomingRecordWidget(SixthWidth, DefaultGraphWidgetHeight),
      this.createDeliveredRecordWidget(SixthWidth, DefaultGraphWidgetHeight),
      this.createLatencyWidget(SixthWidth, DefaultGraphWidgetHeight),
      this.createConversionWidget(SixthWidth, DefaultGraphWidgetHeight),
      this.createLimitWidget(SixthWidth, DefaultGraphWidgetHeight),
    ];
  }

  createTitleWidget() {
    return new MonitoringHeaderWidget({
      family: "Firehose Delivery Stream",
      title: this.title,
      goToLinkUrl: this.streamUrl,
    });
  }

  createIncomingRecordWidget(width: number, height: number) {
    return new GraphWidget({
      width,
      height,
      title: "Records",
      left: [this.incomingRecordsMetric, this.throttledRecordsMetric],
      leftYAxis: CountAxisFromZero,
      leftAnnotations: this.recordCountAnnotations,
    });
  }

  createDeliveredRecordWidget(width: number, height: number) {
    return new GraphWidget({
      width,
      height,
      title: "Records",
      left: [this.deliveredRecordsMetric],
      leftYAxis: CountAxisFromZero,
      leftAnnotations: this.recordCountAnnotations,
    });
  }

  createLatencyWidget(width: number, height: number) {
    return new GraphWidget({
      width,
      height,
      title: "Latency (P90)",
      left: [this.putRecordLatency, this.putRecordBatchLatency],
      leftYAxis: TimeAxisMillisFromZero,
    });
  }

  createConversionWidget(width: number, height: number) {
    return new GraphWidget({
      width,
      height,
      title: "Conversions",
      left: [this.successfulConversionMetric, this.failedConversionMetric],
      leftYAxis: CountAxisFromZero,
    });
  }

  createLimitWidget(width: number, height: number) {
    return new GraphWidget({
      width,
      height,
      title: "Limits (rate)",
      left: [
        this.incomingBytesToLimitRate.with({ label: "Bytes" }),
        this.incomingRecordsToLimitRate.with({ label: "Records" }),
        this.incomingPutRequestsToLimitRate.with({ label: "PutRequests" }),
      ],
      leftYAxis: RateAxisFromZero,
      leftAnnotations: [{ value: 1, label: "100% usage" }],
    });
  }

  createRecordFreshnessWidget(width: number, height: number) {
    return new GraphWidget({
      width,
      height,
      title: "Data Freshness",
      left: [this.maxAgeofRecordsMetric],
      leftYAxis: TimeAxisSecondsFromZero,
      leftAnnotations: this.ageAnnotations,
    });
  }
}
