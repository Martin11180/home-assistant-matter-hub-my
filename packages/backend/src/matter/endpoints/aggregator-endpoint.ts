import { Endpoint } from "@matter/main";
import { FixedLabelServer } from "@matter/main/behaviors";
import { AggregatorEndpoint as AggregatorEndpointType } from "@matter/main/endpoints";

export class AggregatorEndpoint extends Endpoint {
  constructor(id: string) {
    super(
      AggregatorEndpointType.with(
        FixedLabelServer.set({
          labelList: [],
        }),
      ),
      { id },
    );
  }
}
