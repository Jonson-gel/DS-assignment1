import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { bikes, stations } from "../seed/bikes";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class BikeSharingApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Tables 
        const bikesTable = new dynamodb.Table(this, "BikesTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "stationId", type: dynamodb.AttributeType.NUMBER },
            sortKey: { name: "bikeId", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Bikes",
        });

        const stationsTable = new dynamodb.Table(this, "StationsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "stationId", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Stations",
        });

        
    }
}
