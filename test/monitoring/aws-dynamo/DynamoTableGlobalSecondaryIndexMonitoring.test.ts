import { SynthUtils } from "@monocdk-experiment/assert";
import { Stack } from "monocdk";
import { AttributeType, Table } from "monocdk/aws-dynamodb";

import { DynamoTableGlobalSecondaryIndexMonitoring } from "../../../lib";
import { TestMonitoringScope } from "../TestMonitoringScope";

test("snapshot test: no alarms", () => {
  const stack = new Stack();

  const scope = new TestMonitoringScope(stack, "Scope");

  const table = new Table(stack, "Table", {
    tableName: "DummyTable",
    partitionKey: {
      name: "id",
      type: AttributeType.STRING,
    },
  });

  new DynamoTableGlobalSecondaryIndexMonitoring(scope, {
    table,
    globalSecondaryIndexName: "non-existing-index",
  });

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});