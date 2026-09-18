import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/constants.dart';

class MapWidget extends StatefulWidget {
  final Set<Marker> markers;
  final Set<Polyline> polylines;
  final LatLng? initialPosition;
  final Function(GoogleMapController)? onMapCreated;
  final Function(LatLng)? onTap;

  const MapWidget({
    Key? key,
    this.markers = const {},
    this.polylines = const {},
    this.initialPosition,
    this.onMapCreated,
    this.onTap,
  }) : super(key: key);

  @override
  State<MapWidget> createState() => _MapWidgetState();
}

class _MapWidgetState extends State<MapWidget> {
  late CameraPosition _initialCamera;

  @override
  void initState() {
    super.initState();
    _initialCamera = CameraPosition(
      target: widget.initialPosition ??
          const LatLng(AppConstants.cityLat, AppConstants.cityLng),
      zoom: AppConstants.defaultZoom,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: _initialCamera,
      markers: widget.markers,
      polylines: widget.polylines,
      onMapCreated: widget.onMapCreated,
      onTap: widget.onTap,
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      compassEnabled: true,
    );
  }
}
